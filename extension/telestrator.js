const ctx = require('./nodecg');
const nodecg = ctx.get();

// const telestratorLinesRep = nodecg.Replicant('telestratorLines', {
//   defaultValue: [],
// });

// function addTelestratorLine(data) {
//   // telestratorLinesRep.value.push(data);
//   // telestratorLinesRep.value = telestratorLinesRep.value.slice(-500);

//   nodecg.sendMessage('telestratorLineAdded', data);
// }
// nodecg.listenFor('addTelestratorLine', addTelestratorLine);

// function clearTelestrator() {
//   telestratorLinesRep.value = [];
// }
// nodecg.listenFor('clearTelestrator', clearTelestrator);
