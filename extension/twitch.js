const ctx = require("./nodecg");
const nodecg = ctx.get();

const auth = require("@twurple/auth");
const ApiClient = require("@twurple/api").ApiClient;
const fs = require("fs").promises;

const clientId = nodecg.bundleConfig.twitchClientId;
const clientSecret = nodecg.bundleConfig.twitchClientSecret;

const twitchTemplate = nodecg.Replicant("twitchTemplate", {
  defaultValue: "Mystery Tournament 0017! {player1} vs. {player2}",
});

//--------- USERS ---------
// MauriceSY: 210715672
// MFH: 175608452
// MFS: 258966332
// (These are not secret)

//--------- GAME ---------
// MysteryFunHouse: 10553
// Retro: 27284

fs.readFile(__dirname + "/twitch_token.json", "UTF-8").then((str) => {
  const tokenData = JSON.parse(str);

  const authProvider = new auth.RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: async (newTokenData) =>
        fs.writeFile(
          __dirname + "/twitch_token.json",
          JSON.stringify(newTokenData, null, 4),
          "UTF-8"
        ),
    },
    tokenData
  );

  const apiClient = new ApiClient({ authProvider });

  nodecg.listenFor("updateTwitch", function (options, ack) {
    const requestedGame = nodecg.readReplicant("game");

    // template placeholders
    const placeHolders = {
      player1: nodecg.readReplicant("player0name"),
      player2: nodecg.readReplicant("player1name"),
      player3: nodecg.readReplicant("player2name"),
      player4: nodecg.readReplicant("player3name"),
      round1: nodecg.readReplicant("match1round"),
      round2: nodecg.readReplicant("match2round"),
    };

    // replace all placeholders in twitchTemplate
    let title = twitchTemplate.value;
    for (let [placeholder, val] of Object.entries(placeHolders)) {
      title = title.replace("{" + placeholder + "}", val);
    }

    apiClient.games.getGameByName(requestedGame).then((game) => {
      gameId = game ? game.id : "27284"; // default to "Retro" if game not found
      gameName = game ? game.name : "Retro";

      apiClient.channels
        .updateChannelInfo(nodecg.bundleConfig.twitchChannel, {
          title: title,
          gameId: gameId,
        })
        .then(() => {
          ack(null, {
            title: title,
            game: gameName,
          });
        })
        .catch((err) => {
          console.error(err);
          ack(new Error("Something went wrong. Try again or tell Maurice."));
        });
    });
  });
});
