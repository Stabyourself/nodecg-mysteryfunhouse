const ctx = require("./nodecg");
const nodecg = ctx.get();

const apiKey = nodecg.bundleConfig.challongeApiKey;

// `fetch` has no sensible timeout of its own, so a dead/slow connection to Challonge would
// hang this call (and therefore the whole match load) for minutes without this.
const REQUEST_TIMEOUT_MS = 10000;

exports.getTournament = async function(tournament) {
  let url = `https://api.challonge.com/v1/tournaments/${tournament}.json?api_key=${apiKey}&include_participants=1&include_matches=1`;

  let res, text;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await res.text();
  } catch (error) {
    throw new Error(`request to Challonge failed: ${error.message ?? error}`);
  }

  // Error responses aren't guaranteed to be JSON; don't let a parse failure hide the status.
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    body = undefined;
  }

  if (res.status !== 200) {
    const apiErrors = Array.isArray(body?.errors) ? body.errors.join(", ") : undefined;
    throw new Error(`Challonge returned HTTP ${res.status}${apiErrors ? `: ${apiErrors}` : ""}`);
  }

  if (!body?.tournament) {
    throw new Error("Challonge returned a 200 but no tournament data was in the response.");
  }

  return body.tournament;
};
