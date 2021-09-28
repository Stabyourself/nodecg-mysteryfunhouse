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

const replicants = {}

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
    const promises = [
        challonge.getTournament(tournamentName),
        googlesheet.getContactSheet(),
        googlesheet.getCareerSheet(),
        discord.getMembers(),
    ]

    Promise.allSettled(promises).then(results => {
        if (results[0].status == "rejected") {
            return ack(new Error(`Challonge API call failed (${results[0].reason}). Try again or tell Maurice.`))
        }
        if (results[1].status == "rejected") {
            return ack(new Error(`Googlesheet API call failed (${results[1].reason}). Try again or tell Maurice.`))
        }
        if (results[2].status == "rejected") {
            return ack(new Error(`Googlesheet API call failed (${results[2].reason}). Try again or tell Maurice.`))
        }
        if (results[3].status == "rejected") {
            return ack(new Error(`Discord API call faile (${results[3].reason})d. Try again or tell Maurice.`))
        }


        const tournament = results[0].value
        const contactRows = results[1].value
        const careerRows = results[2].value
        const discordMembers = results[3].value

        const playerChallonges = []
        const playerMatches = []
        const playerContacts = []
        const playerDiscords = []
        const playerNames = []
        const playerCareers = []


        // Match stuff
        const match = tournament.matches.find(match => {
            return match.match.suggested_play_order == options.matchId
        })

        if (!match) {
            return ack(new Error("Couldn't find Match ID! Are you sure it was correct?"))
        }

        for (let i = 0; i < 2; i++) {
            // Challonge stuff
            playerChallonges[i] = tournament.participants.find(participant => {
                return participant.participant.id == match.match[`player${i+1}_id`]
            })


            playerMatches[i] = tournament.matches.filter(match => {
                return match.match.player1_id == playerChallonges[i].participant.id || match.match.player2_id == playerChallonges[i].participant.id
            })




            // Contact stuff
            const challongeName = playerChallonges[i].participant.display_name
            const contactRow = contactRows.find(row => {
                return row._rawData[2].toLowerCase() == challongeName.toLowerCase()
            })

            if (contactRow) {
                playerContacts[i] = Object.assign({}, contactRow, {_sheet: undefined})
            } else {
                return ack(new Error(`Couldn't find challonge username "${challongeName}" on the Contact Sheet.`))
            }

            if (!playerContacts[i]["SRL username"]) {
                return ack(new Error(`SRL username for player "${challongeName}" is missing on the Contact Sheet.`))
            }

            if (!playerContacts[i]["Discord Username"]) {
                return ack(new Error(`Discord username for player "${challongeName}" is missing on the Contact Sheet.`))
            }



            // Discord stuff
            const discordNick = playerContacts[i]["Discord Username"]
            const split = discordNick.split("#")

            const discordMember = discordMembers.find(member => {
                return member.user.username.toLowerCase() == split[0].toLowerCase() && member.user.discriminator == split[1]
            })

            if (discordMember) {
                playerDiscords[i] = discordMember
            } else {
                return ack(new Error(`Couldn't find "${discordNick}" in the Mystery Discord server.`))
            }



            // Career stuff
            const SRLName = playerContacts[i]["SRL username"]
            const careerRow = careerRows.find(row => {
                return row._rawData[1].toLowerCase() == SRLName.toLowerCase()
            })

            if (careerRow) {
                playerCareers[i] = Object.assign({}, careerRow, {_sheet: undefined})
            } else {
                return ack(new Error(`Couldn't find SRL username "${SRLName}" on the Career Sheet.`))
            }
        }



        for (let i = 0; i < 2; i++) {
            // Putting it together
            const playerNumber = i + (options.matchNumber == 2 ? 2 : 0)

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


            // Filter data for size reasons maybe?
            playerInfoRep.value[playerNumber] = {
                name: playerNames[i],
                avatar: playerDiscords[i].user.avatarURL({size: 1024}),

                challonge: playerChallonges[i],
                matches: playerMatches[i],
                contact: playerContacts[i],
                career: playerCareers[i],
            }
        }

        nodecg.sendMessage("timerReset")


        return ack(null, `${playerNames[0]}  vs  ${playerNames[1]}`);
    })
})
