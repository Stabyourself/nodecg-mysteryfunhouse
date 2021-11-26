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
const allInfoRep = nodecg.Replicant("allInfo", {defaultValue: []})
const playerInfoRep = nodecg.Replicant("playerInfo", {defaultValue: []})

const playerProps = {
    name: "",
    pronouns: "",
    twitch: "",
    volume: 0,
    streamHidden: false,
    done: false,
    forfeit: false,
    finalTime: "",
    prediction: 50
}

const props = {
    game: "",
    goal: "",
    platform: "",
    submitter: "",
    currentBoxart: null,
    showPlayerCards: false,
    match1round: "",
    match2round: "",
    prediction: 50
}

const replicants = {}

for (let i = 0; i < 4; i++) {
    for (let prop in playerProps) {
        const name = `player${i}${prop}`
        replicants[name] = nodecg.Replicant(name, {defaultValue: playerProps[prop]})
    }
}

for (let prop in props) {
    replicants[prop] = nodecg.Replicant(prop, {defaultValue: props[prop]})
}

function getChallongeForId(tournament, id) {
    return tournament.participants.find(participant => {
        return participant.participant.id == id
    }).participant
}

function getContactRowForChallongeName(contactRows, challongeName) {
    return contactRows.find(row => {
        return row["Challonge Username"].toLowerCase() == challongeName.toLowerCase()
    })
}

function getMemberForDiscordUsername(members, discordUsername) {
    const split = discordUsername.split("#")

    return members.find(member => {
        return member.user.username.toLowerCase() == split[0].toLowerCase() && member.user.discriminator == split[1]
    })
}

function getAvatarForMember(member) {
    let avatar = member.displayAvatarURL({size: 1024})

    if (avatar.search("embed") != -1) {
        avatar = "../dist/img/default_avatar.png"
    }

    return avatar
}


function getPlayerInfo(tournament, contactRows, careerRows, discordMembers, challongeName) {
    // Challonge stuff
    const challonge = tournament.participants.find(participant => {
        return participant.participant.display_name.toLowerCase() == challongeName.toLowerCase()
    })

    if (!challonge) {
        return Error(`Couldn't find challonge username "${challongeName}" in tournament.`)
    }

    const rawMatches = tournament.matches.filter(match => {
        return (
            match.match.player1_id == challonge.participant.id ||
            match.match.player2_id == challonge.participant.id) &&
            match.match.state == "complete"
    })


    // Contact stuff
    const contact = getContactRowForChallongeName(contactRows, challongeName)

    if (!contact) {
        return Error(`Couldn't find challonge username "${challongeName}" on the Contact Sheet.`)
    }

    // if (!contact["SRL username"]) {
    //     return Error(`SRL username for player "${challongeName}" is missing on the Contact Sheet.`)
    // }

    if (!contact["Discord Username"]) {
        return Error(`Discord username for player "${challongeName}" is missing on the Contact Sheet.`)
    }



    // Discord stuff
    const member = getMemberForDiscordUsername(discordMembers, contact["Discord Username"])

    if (!member) {
        return Error(`Couldn't find "${contact["Discord Username"]}" in the Mystery Discord server.`)
    }



    // Career stuff
    const SRLName = contact["SRL username"]
    let career
    if (SRLName) {
        career = careerRows.find(row => {
            return row["Competitor"].toLowerCase() == SRLName.toLowerCase()
        })
    }

    return {
        challonge: challonge ? challonge.participant : null,
        contact: Object.assign({}, contact, {_sheet: undefined}),
        rawMatches: rawMatches,
        career: career ? Object.assign({}, career, {_sheet: undefined}) : null,
        discord: member,
    }
}


nodecg.listenFor("loadMatch", function(options, ack) {
    const promises = [
        challonge.getTournament(nodecg.bundleConfig.challongeTournament),
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
            const challongeName = getChallongeForId(tournament, match.match[`player${i+1}_id`]).display_name

            info[i] = getPlayerInfo(tournament, contactRows, careerRows, discordMembers, challongeName)

            if (info[i] instanceof Error) {
                return ack(info[i])
            }

            info[i].name = info[i].discord.displayName
            info[i].avatar = getAvatarForMember(info[i].discord)

            delete info[i].discord // evil stuff that crashes my replicant >:(
        }


        for (let i = 0; i < 2; i++) {
            // Putting it together

            // format matches
            const matches = []

            for (rawMatch of info[i].rawMatches) {
                rawMatch = rawMatch.match

                let match = {}

                match.id = rawMatch.id
                match.players = []
                match.score = rawMatch.scores_csv

                // fetch player info
                for (let i = 0; i < 2; i++) {
                    const challonge = getChallongeForId(tournament, rawMatch[`player${i+1}_id`])

                    const contact = getContactRowForChallongeName(contactRows, challonge.display_name)

                    let id = challonge.id
                    let name = challonge.display_name
                    let avatar = "../dist/img/default_avatar.png"

                    if (contact) {
                        let member = getMemberForDiscordUsername(discordMembers, contact["Discord Username"])

                        if (!member) {
                            return ack(new Error(`Couldn't find "${contact["Discord Username"]}" in the Mystery Discord server.`))
                        }

                        name = member.displayName
                        avatar = getAvatarForMember(member)
                    }

                    match.players.push({
                        id,
                        name,
                        avatar,
                    })
                }

                // Make sure the player whose matches we're getting is 0
                if (info[i].challonge.id == rawMatch.player2_id) {
                    match.players = match.players.reverse()

                    // turn the score around
                    match.score = match.score.split("-").reverse().join("-")
                }

                // format round
                if (rawMatch.round > 0) {
                    match.round = "Winners " + rawMatch.round
                } else {
                    match.round = "Losers " + -rawMatch.round
                }


                if (rawMatch.winner_id == match.players[0].id) {
                    match.winner = 0
                } else {
                    match.winner = 1
                }

                matches.push(match)
            }

            matches.sort((a,b) => a.id - b.id)

            info[i].matches = matches

            // set panel fields
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

        // Match stuff
        let round = match.match["round"]

        if (round > 0) {
            round = "Winners " + round
        } else {
            round = "Losers " + -round
        }

        replicants[`match${options.matchNumber}round`].value = round


        // Predictions
        let player1votes = match.match["player1_votes"]
        let player2votes = match.match["player2_votes"]
        let totalVotes = player1votes + player2votes


        let leftPlayer = options.matchNumber == 2 ? 2 : 0

        replicants[`player${leftPlayer}prediction`].value = Math.round(player1votes/totalVotes*100)
        replicants[`player${leftPlayer+1}prediction`].value = Math.round(player2votes/totalVotes*100)



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
            info = getPlayerInfo(tournament, contactRows, careerRows, discordMembers, row["Challonge Username"])

            if (!(info instanceof Error)) {
                info.name = info.discord.displayName
                info.avatar = getAvatarForMember(info.discord)

                delete info.discord // evil stuff that crashes my replicant >:(

                allInfo.push(info)
            }
        }

        allInfoRep.value = allInfo

        return ack();
    })
})
