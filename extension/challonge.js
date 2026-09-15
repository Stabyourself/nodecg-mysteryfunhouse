const request = require("request");

const ctx = require("./nodecg");
const nodecg = ctx.get();

const apiKey = nodecg.bundleConfig.challongeApiKey;

// `request` never times out on its own, so a dead/slow connection to Challonge would hang
// this call (and therefore the whole match load) forever without this.
const REQUEST_TIMEOUT_MS = 10000;

exports.getTournament = function(tournament) {
  return new Promise(function(resolve, reject) {
    let url = `https://api.challonge.com/v1/tournaments/${tournament}.json?api_key=${apiKey}&include_participants=1&include_matches=1`;

    request(url, { json: true, timeout: REQUEST_TIMEOUT_MS }, (error, res, body) => {
      if (error) {
        reject(new Error(`request to Challonge failed: ${error.message ?? error}`));
        return;
      }

      if (res.statusCode !== 200) {
        const apiErrors = Array.isArray(body?.errors) ? body.errors.join(", ") : undefined;
        reject(new Error(`Challonge returned HTTP ${res.statusCode}${apiErrors ? `: ${apiErrors}` : ""}`));
        return;
      }

      if (!body?.tournament) {
        reject(new Error("Challonge returned a 200 but no tournament data was in the response."));
        return;
      }

      resolve(body.tournament);
    });
  });
};
