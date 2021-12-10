const ctx = require("./nodecg");
const nodecg = ctx.get();

const timerRep = nodecg.Replicant("timer");
const stopTimerWhenDoneRep = nodecg.Replicant("stopTimerWhenDone", {
  defaultValue: true,
});
const stopTimerWhenDoneCountRep = nodecg.Replicant("stopTimerWhenDoneCount", {
  defaultValue: 2,
});

const { Timer } = require("timer-node");
let timer = new Timer();
let state = "stopped";

let timerObj = {
  ms: 0,
  pausedMs: 0,
  state: "stopped",
};

updateRep();

function play() {
  if (timer.isStopped() || !timer.isStarted()) {
    timer.start();
  }
  if (timer.isPaused()) {
    timer.resume();
  }

  state = "playing";
}
nodecg.listenFor("timerPlay", play);

function pause() {
  state = "paused";
  updateRep();
}
nodecg.listenFor("timerPause", pause);

function reset() {
  timer = new Timer();
  state = "stopped";

  timerObj.ms = timer.ms();
  timerObj.pausedMs = timer.ms();

  updateRep();
}
nodecg.listenFor("timerReset", reset);

function set(input) {
  let parts = input.split(":");
  let parts2 = parts.at(-1).split(".");

  let ms = parts2.length > 1 ? parts2[1] : 0;
  let s = parts2[0];
  parts.pop();

  let subtract = 0;
  subtract += parseInt(ms);
  subtract += parseInt(s) * 1000;

  let mul = 60000;

  for (let i = parts.length - 1; i >= 0; i--) {
    subtract += parseInt(parts[i]) * mul;
    mul *= 60;
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
nodecg.listenFor("timerSet", set);

const raceStates = [];

for (let i = 0; i < 4; i++) {
  raceStates.push(
    nodecg.Replicant("player" + i + "raceState", { defaultValue: "none" })
  );
}

function playerRaceStateChanged(data) {
  let player = data.player;
  let raceState = data.state;

  // check if we wanna stop the timer
  if (stopTimerWhenDoneRep.value) {
    let donePlayers = 0;

    for (let i = 0; i < raceStates.length; i++) {
      if (raceStates[i].value != "none" || player == i) {
        donePlayers++;
      }
    }

    if (state == "playing" && donePlayers >= stopTimerWhenDoneCountRep.value) {
      pause();
    }
  }

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
}
nodecg.listenFor("playerRaceStateChanged", playerRaceStateChanged);

function tick() {
  if (state == "playing" || state == "paused") {
    timerObj.pausedMs = timer.ms();
    if (state == "playing") {
      timerObj.ms = timer.ms();
    }

    updateRep();
  }
}
setInterval(tick, 11);

function updateRep() {
  timerObj.state = state;

  timerRep.value = timerObj;
}
