const ctx = require("./nodecg");
const nodecg = ctx.get();

const apiKey = nodecg.bundleConfig.challongeApiKey;

// `fetch` has no sensible timeout of its own, so a dead/slow connection to Challonge would
// hang this call (and therefore the whole match load) for minutes without this.
const REQUEST_TIMEOUT_MS = 10000;

// a match load needs the whole tournament. loading the other match or trying again right
// after (when another source failed) reuses it for this long instead of asking again, and
// loads at the same time share one request
const RECENT_MS = 60000;
const recent = new Map();

// { tournament, cached }. callers that don't find what they need in a cached one should ask
// again with getTournament, a result may have been reported since
exports.getRecentTournament = async function (tournament) {
  const hit = recent.get(tournament);
  if (hit && Date.now() - hit.at < RECENT_MS) {
    return { tournament: await hit.request, cached: true };
  }

  return { tournament: await exports.getTournament(tournament), cached: false };
};

// always asks challonge (or makes up a tournament in test mode)
exports.getTournament = async function (tournament) {
  const entry = { at: Date.now(), request: testMode ? fakeTournament() : fetchTournament(tournament) };
  recent.set(tournament, entry);

  try {
    return await entry.request;
  } catch (err) {
    if (recent.get(tournament) === entry) recent.delete(tournament);
    throw err;
  }
};

// testing (the "srlTest" bundle config, see srl-fake.js) doesn't ask challonge at all: the
// tournament is everyone signed up for the event with an srl name, two by two in open matches
// #1, #2, ... (in sign up order), with nothing played yet
const testMode = !!nodecg.bundleConfig.srlTest;
exports.testMode = testMode;

async function fakeTournament() {
  // required here, players.js needs this file too
  const contacts = (await require("./players").getContacts())
    .filter((contact) => contact["challonge_username"] && contact["srl_username"])
    .sort((a, b) => Number(a["signup_id"]) - Number(b["signup_id"]));

  const participants = contacts.map((contact, i) => ({
    participant: { id: 1000 + i, display_name: contact["challonge_username"] },
  }));

  const matches = [];
  for (let i = 0; i + 1 < participants.length; i += 2) {
    const order = matches.length + 1;
    matches.push({
      match: {
        id: 5000 + order,
        suggested_play_order: order,
        player1_id: participants[i].participant.id,
        player2_id: participants[i + 1].participant.id,
        state: "open",
        round: 1,
        scores_csv: "",
        winner_id: null,
      },
    });
  }

  return { participants, matches };
}

async function fetchTournament(tournament) {
  let url = `https://api.challonge.com/v1/tournaments/${tournament}.json?api_key=${apiKey}&include_participants=1&include_matches=1`;

  let res, text;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await res.text();
  } catch (error) {
    throw new Error(`request to Challonge failed: ${error.message ?? error}`);
  }

  // Error responses aren't guaranteed to be JSON; don't let a parse failure hide the status.
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    body = undefined;
  }

  if (res.status !== 200) {
    const apiErrors = Array.isArray(body?.errors) ? body.errors.join(", ") : undefined;
    throw new Error(`Challonge returned HTTP ${res.status}${apiErrors ? `: ${apiErrors}` : ""}`);
  }

  if (!body?.tournament) {
    throw new Error("Challonge returned a 200 but no tournament data was in the response.");
  }

  return body.tournament;
}
