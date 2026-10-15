const ctx = require("./nodecg");
const nodecg = ctx.get();
const { acknowledge } = require("./acks");

// not saved: nodecg starting up starts the timer over anyway, and saving it would be a
// database write every 100ms while it runs
const timerRep = nodecg.Replicant("timer", {
  persistent: false,
  defaultValue: { ms: 0, pausedMs: 0, state: "stopped" },
});
const stopTimerWhenDoneRep = nodecg.Replicant("stopTimerWhenDone", {
  defaultValue: true,
});
const stopTimerWhenDoneCountRep = nodecg.Replicant("stopTimerWhenDoneCount", {
  defaultValue: 2,
});

// everything shows whole seconds, so the replicant only changes when a shown second (or the
// state) does. ticking more often than that only keeps the change close to the real second
const TICK = 50;

const { Timer } = require("timer-node");
let timer = new Timer();
let state = "stopped";

let timerObj = {
  ms: 0,
  pausedMs: 0,
};

let shown = null;

updateRep();

function play() {
  if (timer.isStopped() || !timer.isStarted()) {
    timer.start();
  }
  if (timer.isPaused()) {
    timer.resume();
  }

  state = "playing";
  updateRep();
}
nodecg.listenFor("timerPlay", (data, ack) => {
  play();
  acknowledge(ack);
});

// atMs: stop on that time instead of now (never later than now)
function pause(atMs) {
  // the time it was paused at, not the last tick
  timerObj.ms = atMs == null ? timer.ms() : Math.min(atMs, timer.ms());
  timerObj.pausedMs = timerObj.ms;

  state = "paused";
  updateRep();
}
nodecg.listenFor("timerPause", (data, ack) => {
  pause();
  acknowledge(ack);
});

function reset() {
  timer = new Timer();
  state = "stopped";

  timerObj.ms = timer.ms();
  timerObj.pausedMs = timer.ms();

  updateRep();
}
nodecg.listenFor("timerReset", (data, ack) => {
  reset();
  acknowledge(ack);
});

// "h:mm:ss", "mm:ss" or "ss", each with an optional ".fff" (a fraction of a second, so ".5" is
// half a second). null if it isn't a time
function parseTime(input) {
  const match = /^\s*(\d+(?::\d+){0,2})(?:\.(\d+))?\s*$/.exec(String(input ?? ""));
  if (!match) return null;

  let seconds = 0;
  for (const part of match[1].split(":")) {
    seconds = seconds * 60 + Number(part);
  }

  let ms = seconds * 1000;
  if (match[2]) ms += Math.round(Number(`0.${match[2]}`) * 1000);

  return ms;
}

function set(input) {
  const subtract = parseTime(input);

  if (subtract === null) {
    nodecg.log.warn(`timerSet: "${input}" is not a time`);
    return;
  }

  let timestamp = Date.now() - subtract;

  timer = new Timer({
    startTimestamp: timestamp,
  });
  timer.pause();

  state = "stopped";
  timerObj.ms = timer.ms();
  timerObj.pausedMs = timer.ms();

  updateRep();
}
nodecg.listenFor("timerSet", (input, ack) => {
  set(input);
  acknowledge(ack);
});

const raceStates = [];

for (let i = 0; i < 4; i++) {
  raceStates.push(
    nodecg.Replicant("player" + i + "raceState", { defaultValue: "none" })
  );
}

// the players in the srl race srl.js follows, null when there's none
let srlRacers = () => null;

// a race from srl stops once all its racers are done, otherwise after the set number of
// finishes (if that's on)
function shouldPause() {
  const done = (i) => raceStates[i].value != "none";
  const racers = srlRacers();

  if (racers) return racers.length > 0 && racers.every(done);

  return stopTimerWhenDoneRep.value && [0, 1, 2, 3].filter(done).length >= stopTimerWhenDoneCountRep.value;
}

function playerRaceStateChanged(data) {
  let player = data.player;
  let raceState = data.state;

  // check for place (should maybe be part of its own extension script)
  let newState = "none";

  if (raceState == "done") {
    let otherPlayer = player % 2 == 0 ? player + 1 : player - 1;
    newState = "winner";

    if (raceStates[otherPlayer].value == "winner") {
      newState = "loser";
    }
  } else if (raceState == "forfeit") {
    newState = "forfeit";
  }

  raceStates[player].value = newState;

  if (state == "playing" && shouldPause()) {
    pause();
  }
}
nodecg.listenFor("playerRaceStateChanged", (data, ack) => {
  playerRaceStateChanged(data);
  acknowledge(ack);
});

// running since startMs (a Date.now() timestamp), like it was started right then
function startAt(startMs) {
  timer = new Timer({ startTimestamp: startMs });
  state = "playing";
  tick();
}

function tick() {
  if (state == "playing" || state == "paused") {
    timerObj.pausedMs = timer.ms();
    if (state == "playing") {
      timerObj.ms = timer.ms();
    }

    updateRep();
  }
}
setInterval(tick, TICK);

function updateRep() {
  const key = `${state} ${Math.floor(timerObj.ms / 1000)} ${Math.floor(timerObj.pausedMs / 1000)}`;
  if (key === shown) return;
  shown = key;

  timerRep.value = { ms: timerObj.ms, pausedMs: timerObj.pausedMs, state };
}

exports.playerRaceStateChanged = playerRaceStateChanged;
exports.reset = reset;
exports.startAt = startAt;
exports.getState = () => state;
// fn gives the racing player numbers, or null when it doesn't know
exports.setRacers = (fn) => {
  srlRacers = fn;
};
// srl.js set the race states itself: pause if that's everyone through, on lastFinishMs (the
// last finisher's time) when there is one, not when srl was asked
exports.raceStatesChanged = (lastFinishMs) => {
  if (state == "playing" && shouldPause()) pause(lastFinishMs);
};
