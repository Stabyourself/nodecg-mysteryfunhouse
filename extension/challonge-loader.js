const tournamentName = "speedrunslive-mystery15"

const challonge = require("./challonge")

const ctx = require('./nodecg')
const nodecg = ctx.get()

const racerCardInfoRep = nodecg.Replicant("racerCardInfo")
const player1nameRep = nodecg.Replicant("player1name")
const player2nameRep = nodecg.Replicant("player2name")

nodecg.listenFor("loadMatch", function(matchId, ack) {


    challonge.getTournament(tournamentName).then(
        function(tournament) {
            const match = tournament.matches.find(match => {
                return match.match.suggested_play_order == matchId
            })

            if (!match) {
                ack(new Error("Couldn't find Match ID! Are you sure it was correct?"))
                return
            }

            const player1 = tournament.participants.find(participant => {
                return participant.participant.id == match.match.player1_id
            })

            const player2 = tournament.participants.find(participant => {
                return participant.participant.id == match.match.player2_id
            })

            const player1matches = tournament.matches.filter(match => {
                return match.match.player1_id == player1.participant.id || match.match.player2_id == player1.participant.id
            })

            const player2matches = tournament.matches.filter(match => {
                return match.match.player1_id == player2.participant.id || match.match.player2_id == player2.participant.id
            })

            // Filter data for size reasons maybe?

            racerCardInfoRep.value = {
                player1: player1,
                player2: player2,
                player1matches: player1matches,
                player2matches: player2matches,
            }

            player1nameRep.value = player1.participant.display_name
            player2nameRep.value = player2.participant.display_name

            ack(null, `${player1.participant.display_name} × ${player2.participant.display_name}`);
        }
    )
})
