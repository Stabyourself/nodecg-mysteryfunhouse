const ctx = require("./nodecg");

module.exports = function (nodecg) {
  ctx.set(nodecg);

  // one broken part (missing token, no db, ...) shouldn't take the rest down with it
  for (const name of [
    "./acks",
    "./timer",
    "./players",
    "./challonge-loader",
    "./twitch",
    "./srl",
    "./schedule",
    "./replay",
    "./boxart-fetch",
  ]) {
    try {
      require(name);
    } catch (err) {
      nodecg.log.error(`${name} failed to load:`, err);
    }
  }
};
