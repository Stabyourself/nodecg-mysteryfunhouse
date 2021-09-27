const tournamentName = "speedrunslive-mystery15"

const challonge = require("./challonge")
const googlesheet = require("./googlesheet")
const discord = require("./discord")

const _ = require("lodash")

const ctx = require('./nodecg')
const { arch } = require("os")
const nodecg = ctx.get()

function capitalizeWords(str) {
    return str.replace(/\b[a-z]/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// Replicant stuff
const playerInfoRep = nodecg.Replicant("playerInfo", {defaultValue: []})

const playerProps = [
    "name",
    "pronouns",
    "twitch",
    "volume",
    "streamHidden",
    "done",
    "forfeit",
    "finalTime"
]

const props = [
    "game",
    "goal",
    "platform",
    "submitter",
    "currentBoxart",
    "showPlayerCards",
]

let replicants = {}

for (let i = 0; i < 4; i++) {
    for (playerProp of playerProps) {
        const name = `player${i}${playerProp}`
        replicants[name] = nodecg.Replicant(name)
    }
}

for (prop of props) {
    replicants[prop] = nodecg.Replicant(prop)
}


nodecg.listenFor("loadMatch", function(options, ack) {
    challonge.getTournament(tournamentName)
    .then(tournament => {
        // Challonge stuff
        const match = tournament.matches.find(match => {
            return match.match.suggested_play_order == options.matchId
        })

        if (!match) {
            ack(new Error("Couldn't find Match ID! Are you sure it was correct?"))
            return
        }



        const players = []

        players[0] = tournament.participants.find(participant => {
            return participant.participant.id == match.match.player1_id
        })

        players[1] = tournament.participants.find(participant => {
            return participant.participant.id == match.match.player2_id
        })



        const playerMatches = []

        playerMatches[0] = tournament.matches.filter(match => {
            return match.match.player1_id == players[0].participant.id || match.match.player2_id == players[0].participant.id
        })

        playerMatches[1] = tournament.matches.filter(match => {
            return match.match.player1_id == players[1].participant.id || match.match.player2_id == players[1].participant.id
        })


        let contactPromises = [
            googlesheet.getContactInfo(players[0].participant.display_name),
            googlesheet.getContactInfo(players[1].participant.display_name),
        ]

        Promise.allSettled(contactPromises).then(results => {
            const playerContacts = results.map(result => result.value)

            let secondPromises = []

            for (let i = 0; i < 2; i++) {
                if (playerContacts[i]) {
                    if (!playerContacts[i]["SRL username"]) {
                        ack(new Error(`SRL username for player "${players[i].participant.display_name}" is missing on the Contact Sheet.`))
                        return
                    }
                    secondPromises.push(googlesheet.getCareerInfo(playerContacts[i]["SRL username"]))


                    if (!playerContacts[i]["Discord Username"]) {
                        ack(new Error(`Discord username for player "${players[i].participant.display_name}" is missing on the Contact Sheet.`))
                        return
                    }
                    secondPromises.push(discord.getMember(playerContacts[i]["Discord Username"]))
                } else {
                    ack(new Error(`Couldn't find Challonge username "${players[i].participant.display_name}" on the Contact Sheet.`))
                    return
                }
            }


            Promise.allSettled(secondPromises).then(results => {
                const playerCareers = []
                const playerDiscords = []
                if (results[0].status == "fulfilled") {
                    playerCareers[0] = results[0].value
                } else {
                    // ack(new Error(results[0].reason))
                    // return
                }

                if (results[1].status == "fulfilled") {
                    playerDiscords[0] = results[1].value
                } else {
                    ack(new Error(results[1].reason))
                    return
                }

                if (results[2].status == "fulfilled") {
                    playerCareers[1] = results[2].value
                } else {
                    // ack(new Error(results[2].reason))
                    // return
                }

                if (results[3].status == "fulfilled") {
                    playerDiscords[1] = results[3].value
                } else {
                    ack(new Error(results[3].reason))
                    return
                }

                const playerNames = []

                for (let i = 0; i < 2; i++) {
                    let playerNumber = i + (options.matchNumber == 2 ? 2 : 0)

                    playerNames[i] = playerDiscords[i].nickname ?? playerDiscords[i].user.username
                    let pronouns = ""
                    let twitch = ""

                    if (playerContacts[i]) {
                        pronouns = playerContacts[i]['Pronoun']
                        twitch = playerContacts[i]['Twitch Channel']
                    }

                    replicants[`player${playerNumber}name`].value = playerNames[i]
                    replicants[`player${playerNumber}pronouns`].value = capitalizeWords(pronouns)
                    replicants[`player${playerNumber}twitch`].value = twitch

                    replicants[`player${playerNumber}volume`].value = 0
                    replicants[`player${playerNumber}streamHidden`].value = false
                    replicants[`player${playerNumber}done`].value = false
                    replicants[`player${playerNumber}forfeit`].value = false
                    replicants[`player${playerNumber}finalTime`].value = ""
                }

                // replicants["game"].value = ""
                // replicants["goal"].value = ""
                // replicants["platform"].value = ""
                // replicants["submitter"].value = ""
                // replicants["currentBoxart"].value = ""

                // replicants["showPlayerCards"].value = false

                nodecg.sendMessage("timerReset")



                // Filter data for size reasons maybe?


                for (let i = 0; i < 2; i++) {
                    let playerNumber = i + (options.matchNumber == 2 ? 2 : 0)
                    playerInfoRep.value[playerNumber] = {
                        name: playerNames[i],
                        avatar: playerDiscords[i].user.avatarURL({size: 1024}),

                        challonge: players[i],
                        matches: playerMatches[i],
                        contact: playerContacts[i],
                        career: playerCareers[i],
                    }
                }

                ack(null, `${playerNames[0]}  vs  ${playerNames[1]}`);
            }) // career sheet promise
        }) // contact sheet promise
    }) // tournament promise
    .catch(res => {
        if (res.errno) {
            ack(new Error(`Looks like the Challonge API is down (${res.code}). Try again.`))
        } else {
            ack(new Error(`Got status code ${res} on the Challonge request. Tell Maurice!`))
        }
    })
})
