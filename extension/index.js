const ctx = require("./nodecg");

module.exports = function (nodecg) {
  ctx.set(nodecg);

  // one broken part (missing token, no db, ...) shouldn't take the rest down with it
  for (const name of [
    "./timer",
    "./players",
    "./challonge-loader",
    "./twitch",
    "./schedule",
    "./card-api",
    "./telestrator",
    "./replay",
  ]) {
    try {
      require(name);
    } catch (err) {
      nodecg.log.error(`${name} failed to load:`, err);
    }
  }
};
