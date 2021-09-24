const tournamentName = "speedrunslive-mystery15"

const challonge = require("./challonge")

const ctx = require('./nodecg')
const nodecg = ctx.get()

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
    challonge.getTournament(tournamentName).then(
        function(tournament) {
            const match = tournament.matches.find(match => {
                return match.match.suggested_play_order == options.matchId
            })

            if (!match) {
                ack(new Error("Couldn't find Match ID! Are you sure it was correct?"))
                return
            }

            const players = []

            players[1] = tournament.participants.find(participant => {
                return participant.participant.id == match.match.player1_id
            })

            players[2] = tournament.participants.find(participant => {
                return participant.participant.id == match.match.player2_id
            })

            const player1matches = tournament.matches.filter(match => {
                return match.match.player1_id == players[1].participant.id || match.match.player2_id == players[1].participant.id
            })

            const player2matches = tournament.matches.filter(match => {
                return match.match.player1_id == players[2].participant.id || match.match.player2_id == players[2].participant.id
            })

            // Filter data for size reasons maybe?

            racerCardInfoRep.value = {
                player1: players[1],
                player2: players[2],
                player1matches: player1matches,
                player2matches: player2matches,
            }

            for (let i = 1; i <= 2; i++) {
                let playerNumber = i + (options.matchNumber == 2 ? 2 : 0)

                replicants[`player${playerNumber}name`].value = players[i].participant.display_name
                replicants[`player${playerNumber}pronouns`].value = ""
                replicants[`player${playerNumber}twitch`].value = ""
                replicants[`player${playerNumber}volume`].value = 0
                replicants[`player${playerNumber}streamHidden`].value = false
                replicants[`player${playerNumber}done`].value = false
                replicants[`player${playerNumber}forfeit`].value = false
                replicants[`player${playerNumber}finalTime`].value = ""
            }

            // don't think I need to reset these
            replicants["game"].value = ""
            replicants["goal"].value = ""
            replicants["platform"].value = ""
            replicants["submitter"].value = ""
            replicants["currentBoxart"].value = ""

            nodecg.sendMessage("timerReset")

            ack(null, `${players[1].participant.display_name} × ${players[2].participant.display_name}`);
        }
    )
})
