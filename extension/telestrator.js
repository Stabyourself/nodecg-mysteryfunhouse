const ctx = require("./nodecg");
const nodecg = ctx.get();

const telestratorLinesRep = nodecg.Replicant("telestratorLines", {
  defaultValue: [],
});


function addTelestratorLine(data) {
  telestratorLinesRep.value.push(data);
  telestratorLinesRep.value = telestratorLinesRep.value.slice(-100)
}
nodecg.listenFor("addTelestratorLine", addTelestratorLine);
