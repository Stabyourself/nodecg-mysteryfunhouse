const request = require ("request")

const ctx = require('./nodecg')
const nodecg = ctx.get()

const apiKey = nodecg.bundleConfig.challongeApiKey
const options = {
    json: true
}

exports.getTournament = function(tournament) {
    return new Promise(function(resolve, reject) {
        url = `https://api.challonge.com/v1/tournaments/${tournament}.json?api_key=${apiKey}&include_participants=1&include_matches=1`

        request(url, options, (error, res, body) => {
            if (!error && res.statusCode == 200) {
                resolve(body.tournament)
            };

            reject(body.errors)
        })
    })
}

exports.getMatch = function(tournament, match) {
    return new Promise(function(resolve, reject) {
        url = `https://api.challonge.com/v1/tournaments/${tournament}/matches/${match}.json?api_key=${apiKey}&include_attachments=1`

        request(url, options, (error, res, body) => {
            if (!error && res.statusCode == 200) {
                resolve(body.match)
            };

            reject(body.errors)
        })
    })
}

exports.getPlayer = function(tournament, participant) {
    return new Promise(function(resolve, reject) {
        url = `https://api.challonge.com/v1/tournaments/${tournament}/participants/${participant}.json?api_key=${apiKey}&include_matches=1`

        request(url, options, (error, res, body) => {
            if (!error && res.statusCode == 200) {
                resolve(body.participant)
            };

            reject(body.errors)
        })
    })
}
