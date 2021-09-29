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
const allInfoRep = nodecg.Replicant("allInfo", {defaultValue: []})
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

function getPlayerInfo(tournament, contactRows, careerRows, discordMembers, challongeName) {
    // Challonge stuff
    const challonge = tournament.participants.find(participant => {
        return participant.participant.display_name.toLowerCase() == challongeName.toLowerCase()
    })

    const matches = tournament.matches.filter(match => {
        return match.match.player1_id == challonge.participant.id || match.match.player2_id == challonge.participant.id
    })


    // Contact stuff
    const contact = contactRows.find(row => {
        return row["Challonge Username"].toLowerCase() == challongeName.toLowerCase()
    })

    if (!contact) {
        return Error(`Couldn't find challonge username "${challongeName}" on the Contact Sheet.`)
    }

    if (!contact["SRL username"]) {
        return Error(`SRL username for player "${challongeName}" is missing on the Contact Sheet.`)
    }

    if (!contact["Discord Username"]) {
        return Error(`Discord username for player "${challongeName}" is missing on the Contact Sheet.`)
    }



    // Discord stuff
    const discordNick = contact["Discord Username"]
    const split = discordNick.split("#")

    const member = discordMembers.find(member => {
        return member.user.username.toLowerCase() == split[0].toLowerCase() && member.user.discriminator == split[1]
    })

    if (!member) {
        return Error(`Couldn't find "${discordNick}" in the Mystery Discord server.`)
    }



    // Career stuff
    const SRLName = contact["SRL username"]
    const career = careerRows.find(row => {
        return row["Competitor"].toLowerCase() == SRLName.toLowerCase()
    })

    return {
        challonge: challonge,
        contact: Object.assign({}, contact, {_sheet: undefined}),
        matches: matches,
        career: career ? Object.assign({}, career, {_sheet: undefined}) : null,
        discord: member,
    }
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
            return ack(new Error(`Discord API call failed (${results[3].reason}). Try again or tell Maurice.`))
        }


        const tournament = results[0].value
        const contactRows = results[1].value
        const careerRows = results[2].value
        const discordMembers = results[3].value

        const info = []

        // Match stuff
        const match = tournament.matches.find(match => {
            return match.match.suggested_play_order == options.matchId
        })

        if (!match) {
            return ack(new Error("Couldn't find Match ID! Are you sure it was correct?"))
        }

        for (let i = 0; i < 2; i++) {
            const challongeName = tournament.participants.find(participant => {
                return participant.participant.id == match.match[`player${i+1}_id`]
            }).participant.display_name

            info[i] = getPlayerInfo(tournament, contactRows, careerRows, discordMembers, challongeName)

            if (info[i] instanceof Error) {
                return ack(info)
            }

            info[i].name = info[i].discord.displayName
            info[i].avatar = info[i].discord.user.displayAvatarURL({size: 1024})

            delete info[i].discord // evil stuff that crashes my replicant >:(
        }


        for (let i = 0; i < 2; i++) {
            // Putting it together
            const playerNumber = i + (options.matchNumber == 2 ? 2 : 0)

            let pronouns = ""
            let twitch = ""

            if (info[i].contact) {
                pronouns = info[i].contact['Pronoun']
                twitch = info[i].contact['Twitch Channel']
            }

            replicants[`player${playerNumber}name`].value = info[i].name
            replicants[`player${playerNumber}pronouns`].value = capitalizeWords(pronouns)
            replicants[`player${playerNumber}twitch`].value = twitch

            replicants[`player${playerNumber}volume`].value = 0
            replicants[`player${playerNumber}streamHidden`].value = false
            replicants[`player${playerNumber}done`].value = false
            replicants[`player${playerNumber}forfeit`].value = false
            replicants[`player${playerNumber}finalTime`].value = ""


            // Filter data for size reasons maybe?
            playerInfoRep.value[playerNumber] = info[i]
        }

        nodecg.sendMessage("timerReset")


        return ack(null, `${info[0].name}  vs  ${info[1].name}`);
    })
})

nodecg.listenFor("loadAllCards", function(options, ack) {
    const promises = [
        challonge.getTournament("speedrunslive-mystery16"),
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
            return ack(new Error(`Discord API call failed (${results[3].reason}). Try again or tell Maurice.`))
        }


        const tournament = results[0].value
        const contactRows = results[1].value
        const careerRows = results[2].value
        const discordMembers = results[3].value

        const allInfo = []

        for (row of contactRows) {
            const challongeName = row["Challonge Username"]

            info = getPlayerInfo(tournament, contactRows, careerRows, discordMembers, challongeName)

            console.log(challongeName)

            if (!(info instanceof Error)) {
                info.name = info.discord.displayName
                info.avatar = info.discord.user.displayAvatarURL({size: 1024})

                delete info.discord // evil stuff that crashes my replicant >:(

                allInfo.push(info)
            }
        }

        allInfoRep.value = allInfo

        return ack();
    })
})
