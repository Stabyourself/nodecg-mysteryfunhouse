const ctx = require('./nodecg')
const nodecg = ctx.get()

const auth = require('@twurple/auth')
const ApiClient = require('@twurple/api').ApiClient
const fs = require('fs').promises;

const clientId = nodecg.bundleConfig.twitchClientId;
const clientSecret = nodecg.bundleConfig.twitchClientSecret;

//--------- USERS ---------
// MauriceSY: 210715672
// MFH: 175608452
// MFS: 258966332
// (These are not secret)

//--------- GAME ---------
// MysteryFunHouse: 10553

fs.readFile(__dirname + '/twitch_token.json', 'UTF-8').then((str) => {
    const tokenData = JSON.parse(str)

    const authProvider = new auth.RefreshingAuthProvider(
        {
            clientId,
            clientSecret,
            onRefresh: async newTokenData => fs.writeFile(__dirname + '/twitch_token.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
        },
        tokenData
    );

    const apiClient = new ApiClient({ authProvider })


    nodecg.listenFor("updateTwitch", function(options, ack) {
        const requestedGame = nodecg.readReplicant("game")
        const player0name = nodecg.readReplicant("player0name")
        const player1name = nodecg.readReplicant("player1name")

        const title = `Mystery Tournament 16! ${player0name} vs. ${player1name}`

        apiClient.games.getGameByName(requestedGame).then(game => {
            gameId = game ? game.id : "10553" // default to "Mystery Fun House" if game not found
            gameName = game ? game.name : "Mystery Fun House"

            apiClient.channels.updateChannelInfo(nodecg.bundleConfig.twitchChannel, {
                title: title,
                gameId: gameId,
            }).then(() => {
                let msg = `Done!\nTitle: ${title}\nGame: ${gameName}`

                ack(null, msg)
            }).catch(() => {
                ack(new Error("Something went wrong. Try again or tell Maurice."))
            })
        })
    })
});