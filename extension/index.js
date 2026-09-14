const ctx = require("./nodecg");

module.exports = function (nodecg) {
  ctx.set(nodecg);

  require("./timer");
  require("./players");
  require("./challonge-loader");
  require("./twitch");
  require("./schedule");
  require("./card-api");
  require("./boxart-uploader");
  require("./telestrator");
};
