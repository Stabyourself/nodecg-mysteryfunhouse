const ctx = require("./nodecg");
const nodecg = ctx.get();
const players = require("./players");

const auth = require("@twurple/auth");
const ApiClient = require("@twurple/api").ApiClient;
const fs = require("fs").promises;

const clientId = nodecg.bundleConfig.twitchClientId;
const clientSecret = nodecg.bundleConfig.twitchClientSecret;
const channel = nodecg.bundleConfig.twitchChannel;

// keep in sync with the reset in TwitchOptions.vue
const DEFAULT_TEMPLATE = "{tournament}! {player1} vs. {player2}";

const twitchTemplate = nodecg.Replicant("twitchTemplate", { defaultValue: DEFAULT_TEMPLATE });
// the old default had the tournament written in
if (twitchTemplate.value == "Mystery Tournament 21! {player1} vs. {player2}") {
  twitchTemplate.value = DEFAULT_TEMPLATE;
}

// the title and game follow the players and game on the layout, live or not
const autoRep = nodecg.Replicant("twitchAuto", { defaultValue: true });

// what's on the channel right now, for the dashboard
const statusRep = nodecg.Replicant("twitchStatus", {
  persistent: false,
  defaultValue: { connected: false, live: false, title: "", game: "", error: null, lastUpdate: null },
});

//--------- USERS ---------
// MauriceSY: 210715672
// MFH: 175608452
// MFS: 258966332
// (These are not secret)

//--------- GAME ---------
// MysteryFunHouse: 10553
// Retro: 27284
const RETRO = { id: "27284", name: "Retro" };

// how often we look whether the channel is live and what its title is
const POLL_INTERVAL = 30000;
// players and game come in one by one on a match load, wait for them to settle
const AUTO_DELAY = 2000;
// twitch's limit
const MAX_TITLE = 140;

// the replicants that end up in the title or game
const WATCHED = [
  "player0name",
  "player1name",
  "player2name",
  "player3name",
  "match1round",
  "match2round",
  "game",
  "signupEventId",
];

// letters and digits only: "Super Mario Bros." and "super mario bros" are the same game
function simple(str) {
  return String(str ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function setStatus(changes) {
  statusRep.value = { ...statusRep.value, ...changes };
}

fs.readFile(__dirname + "/twitch_token.json", "UTF-8").then((str) => {
  const tokenData = JSON.parse(str);

  const authProvider = new auth.RefreshingAuthProvider({ clientId, clientSecret });

  authProvider.onRefresh(async (userId, newTokenData) =>
    fs.writeFile(
      __dirname + "/twitch_token.json",
      JSON.stringify(newTokenData, null, 4),
      "UTF-8"
    )
  );

  // twitchChannel is the numeric user id of the channel the token belongs to
  authProvider.addUser(channel, tokenData);

  // tokens from before twurple 8 have user:edit:broadcast, which can't change the title anymore
  const missingScope = !authProvider.getCurrentScopesForUser(channel).includes("channel:manage:broadcast");
  const SCOPE_ERROR = "The Twitch token can't change the title. Run `yarn twitch-auth` and restart NodeCG.";
  if (missingScope) nodecg.log.error(SCOPE_ERROR);

  const apiClient = new ApiClient({ authProvider });

  // ---- title ----

  async function buildTitle() {
    let template = twitchTemplate.value ?? "";

    let tournament = "";
    if (template.includes("{tournament}")) {
      try {
        tournament = await players.getEventName();
      } catch (err) {
        nodecg.log.warn("Couldn't get the event name for the stream title:", err.message);
      }
    }

    const placeHolders = {
      tournament,
      game: nodecg.readReplicant("game"),
      player1: nodecg.readReplicant("player0name"),
      player2: nodecg.readReplicant("player1name"),
      player3: nodecg.readReplicant("player2name"),
      player4: nodecg.readReplicant("player3name"),
      round1: nodecg.readReplicant("match1round"),
      round2: nodecg.readReplicant("match2round"),
    };

    let title = template;
    for (const [placeholder, val] of Object.entries(placeHolders)) {
      title = title.replaceAll("{" + placeholder + "}", val ?? "");
    }

    // an empty {tournament} shouldn't leave "! A vs. B"
    title = title.replace(/\s+/g, " ").replace(/^[\s!:|,-]+/, "").trim();
    return title.slice(0, MAX_TITLE);
  }

  // ---- game ----

  const gameCache = new Map();

  // the twitch category for a game from the sheet: the one with its exact name, else the
  // search result that's the same game written differently ("Big 2 Small" / "Big2Small") or
  // the closest one that starts with it or it starts with ("Mega Man 2" / "Mega Man II"
  // doesn't). Retro if nothing fits, an obscure game is better there than in a wrong one
  async function guessGame(name) {
    const wanted = simple(name);
    if (!wanted) return RETRO;
    if (gameCache.has(wanted)) return gameCache.get(wanted);

    let found = await apiClient.games.getGameByName(name);

    if (!found) {
      const { data } = await apiClient.search.searchCategories(name);
      found =
        data.find((game) => simple(game.name) == wanted) ??
        data
          .filter((game) => {
            const other = simple(game.name);
            const shorter = Math.min(other.length, wanted.length);
            return shorter >= 5 && (other.startsWith(wanted) || wanted.startsWith(other));
          })
          .sort((a, b) => Math.abs(simple(a.name).length - wanted.length) - Math.abs(simple(b.name).length - wanted.length))[0];
    }

    const game = found ? { id: found.id, name: found.name } : RETRO;
    gameCache.set(wanted, game);
    return game;
  }

  // ---- updating ----

  // one update at a time, the auto ones and the button share it
  let queue = Promise.resolve();

  function apply(auto) {
    const run = queue.then(async () => {
      if (missingScope) throw new Error(SCOPE_ERROR);

      const title = await buildTitle();

      // nothing loaded yet, don't put a title with no players on the stream
      if (auto && !nodecg.readReplicant("player0name") && !nodecg.readReplicant("player1name")) return null;

      const game = await guessGame(nodecg.readReplicant("game"));

      if (auto && title == statusRep.value.title && game.name == statusRep.value.game) return null;

      await apiClient.channels.updateChannelInfo(channel, { title, gameId: game.id });
      setStatus({ title, game: game.name, error: null, lastUpdate: Date.now() });
      nodecg.log.info(`Stream info ${auto ? "auto-" : ""}updated: "${title}" / ${game.name}`);

      return { title, game: game.name };
    });

    queue = run.catch(() => {});
    return run;
  }

  let autoTimer = null;

  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (!autoRep.value) return;

    autoTimer = setTimeout(() => {
      apply(true).catch((err) => {
        nodecg.log.error("auto-updating the stream info failed:", err);
        setStatus({ error: `Auto-update failed: ${err.message}` });
      });
    }, AUTO_DELAY);
  }

  for (const name of WATCHED) {
    nodecg.Replicant(name).on("change", (value, old) => {
      if (old !== undefined) scheduleAuto();
    });
  }
  twitchTemplate.on("change", (value, old) => old !== undefined && scheduleAuto());
  autoRep.on("change", (value, old) => old !== undefined && scheduleAuto());

  // ---- polling ----

  async function poll() {
    try {
      const [stream, info] = await Promise.all([
        apiClient.streams.getStreamByUserId(channel),
        apiClient.channels.getChannelInfoById(channel),
      ]);

      setStatus({
        connected: true,
        live: !!stream,
        title: info?.title ?? "",
        game: info?.gameName ?? "",
        ...(statusRep.value.error?.startsWith("Couldn't reach Twitch") && { error: null }),
      });
    } catch (err) {
      nodecg.log.warn("Couldn't get the stream status:", err.message);
      setStatus({ connected: false, error: `Couldn't reach Twitch: ${err.message}` });
    }
  }

  if (missingScope) setStatus({ error: SCOPE_ERROR });
  poll();
  setInterval(poll, POLL_INTERVAL);

  nodecg.listenFor("updateTwitch", async function (options, ack) {
    try {
      ack(null, await apply(false));
    } catch (err) {
      nodecg.log.error("updating the stream info failed:", err);
      ack(new Error(err.message || "Something went wrong. Try again or tell Maurice."));
    }
  });
})
  // without a token file there's no stream info updating, but everything else in the
  // bundle has to keep working
  .catch((err) => {
    nodecg.log.error("twitch setup failed, stream info updating is off:", err.message);
    setStatus({ connected: false, error: `Twitch isn't set up: ${err.message}` });
  });
