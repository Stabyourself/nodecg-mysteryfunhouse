const tournamentName = "speedrunslive-mystery15"

const challonge = require("./challonge")
const googlesheet = require("./googlesheet")
const discord = require("./discord")

const _ = require("lodash")

const ctx = require('./nodecg')
const nodecg = ctx.get()

function capitalizeWords(str) {
    return str.replace(/\b[a-z]/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

// Replicant stuff
const racerCardInfoRep = nodecg.Replicant("racerCardInfo")

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
]

let replicants = {}

for (let i = 1; i <= 4; i++) {
    for (playerProp of playerProps) {
        const name = `player${i}${playerProp}`
        replicants[name] = nodecg.Replicant(name)
    }
}

for (prop of props) {
    replicants[prop] = nodecg.Replicant(prop)
}


nodecg.listenFor("loadMatch", function(options, ack) {
    challonge.getTournament(tournamentName).then(tournament => {
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
                    secondPromises.push(googlesheet.getCareerInfo(playerContacts[i]["SRL username"]))
                    secondPromises.push(discord.getAvatar(playerContacts[i]["Discord Username"]))
                }
            }


            Promise.allSettled(secondPromises).then(results => {
                const playerCareers = []
                const playerAvatars = []
                if (results[0]) {
                    playerCareers[0] = results[0].value
                }
                if (results[1]) {
                    playerAvatars[0] = results[1].value
                }
                if (results[2]) {
                    playerCareers[1] = results[2].value
                }
                if (results[3]) {
                    playerAvatars[1] = results[3].value
                }

                for (let i = 0; i < 2; i++) {
                    let playerNumber = i + 1 + (options.matchNumber == 2 ? 2 : 0)

                    let name = players[i].participant.display_name
                    let pronouns = ""
                    let twitch = ""

                    if (playerContacts[i]) {
                        pronouns = playerContacts[i]['Preferred pronoun.']
                        twitch = playerContacts[i]['Twitch Channel']
                    }

                    replicants[`player${playerNumber}name`].value = name
                    replicants[`player${playerNumber}pronouns`].value = capitalizeWords(pronouns)
                    replicants[`player${playerNumber}twitch`].value = twitch

                    replicants[`player${playerNumber}volume`].value = 0
                    replicants[`player${playerNumber}streamHidden`].value = false
                    replicants[`player${playerNumber}done`].value = false
                    replicants[`player${playerNumber}forfeit`].value = false
                    replicants[`player${playerNumber}finalTime`].value = ""
                }

                replicants["game"].value = ""
                replicants["goal"].value = ""
                replicants["platform"].value = ""
                replicants["submitter"].value = ""
                replicants["currentBoxart"].value = ""

                nodecg.sendMessage("timerReset")



                // Filter data for size reasons maybe?



                racerCardInfoRep.value = [
                    {
                        challonge: players[0],
                        matches: playerMatches[0],
                        career: playerCareers[0],
                        avatar: playerAvatars[0],
                    },
                    {
                        challonge: players[1],
                        matches: playerMatches[1],
                        career: playerCareers[1],
                        avatar: playerAvatars[1],
                    }
                ]

                ack(null, `${players[0].participant.display_name} × ${players[1].participant.display_name}`);
            })
        })
    })
})
