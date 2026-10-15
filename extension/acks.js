const ctx = require("./nodecg");
const nodecg = ctx.get();

// nodecg's browser api waits for an answer to every message a page sends, and keeps the
// callback until one comes. a message nobody answers stays in that page's memory until it
// disconnects, and obs keeps its pages open for hours (the telestrator and the replay borders
// send dozens a second). these only go from page to page, so they are answered here. the
// extension's own message handlers answer theirs with acknowledge()

function acknowledge(ack) {
  if (typeof ack === "function" && !ack.handled) ack();
}

const PAGE_TO_PAGE = [
  "telestratorStroke",
  "telestratorUndo",
  "clearTelestrator",
  "videoRects",
  "requestVideoRects",
  "requestPlayerFrame",
  "playerFrame",
  "playSound",
];

for (let i = 0; i < 4; i++) {
  PAGE_TO_PAGE.push(`stream${i}reload`);
}

for (const name of PAGE_TO_PAGE) {
  nodecg.listenFor(name, (data, ack) => acknowledge(ack));
}

exports.acknowledge = acknowledge;
