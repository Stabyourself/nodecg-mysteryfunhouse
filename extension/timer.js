const ctx = require('./nodecg')
const nodecg = ctx.get()

const timerRep = nodecg.Replicant("timer")
const stopTimerWhenDoneRep = nodecg.Replicant("stopTimerWhenDone")
const stopTimerWhenDoneCountRep = nodecg.Replicant("stopTimerWhenDoneCount")

const { Timer } = require('timer-node');
let timer = new Timer();
let state = "stopped"

let timerObj = {
    ms: 0,
    pausedMs: 0,
    state: "stopped",
}

updateRep()



function play() {
    if (timer.isStopped() || !timer.isStarted()) {
        timer.start()
    }
    if (timer.isPaused()) {
        timer.resume()
    }

    state = "playing"
}
nodecg.listenFor("timerPlay", play)



function pause() {
    state = "paused"
    updateRep()
}
nodecg.listenFor("timerPause", pause)



function reset() {
    timer = new Timer()
    state = "stopped"

    timerObj.ms = timer.ms()
    timerObj.pausedMs = timer.ms()

    updateRep()
}
nodecg.listenFor("timerReset", reset)



function set(input) {
    let parts = input.split(':')
    let parts2 = parts.at(-1).split('.')

    let ms = parts2.length > 1 ? parts2[1] : 0
    let s = parts2[0]
    parts.pop()

    let subtract = 0
    subtract += parseInt(ms)
    subtract += parseInt(s)*1000

    let mul = 60000

    for (let i = parts.length-1; i >= 0; i--) {
        subtract += parseInt(parts[i]) * mul
        mul *= 60
    }

    let timestamp = Date.now() - subtract

    timer = new Timer({
        startTimestamp: timestamp
    });
    timer.pause()

    state = "stopped"
    timerObj.ms = timer.ms()
    timerObj.pausedMs = timer.ms()

    updateRep()
}
nodecg.listenFor("timerSet", set)


// this is good code, I promise.
const player1doneRep = nodecg.Replicant("player1done")
const player2doneRep = nodecg.Replicant("player2done")
const player3doneRep = nodecg.Replicant("player3done")
const player4doneRep = nodecg.Replicant("player4done")
const player1forfeitRep = nodecg.Replicant("player1forfeit")
const player2forfeitRep = nodecg.Replicant("player2forfeit")
const player3forfeitRep = nodecg.Replicant("player3forfeit")
const player4forfeitRep = nodecg.Replicant("player4forfeit")

function checkForPause(changed) {
    console.log(changed)
    if (stopTimerWhenDoneRep.value) {
        let donePlayers = 0

        if (player1doneRep.value || player1forfeitRep.value || changed == 1) {
            donePlayers++;
        }
        if (player2doneRep.value || player2forfeitRep.value || changed == 2) {
            donePlayers++;
        }
        if (player3doneRep.value || player3forfeitRep.value || changed == 3) {
            donePlayers++;
        }
        if (player4doneRep.value || player4forfeitRep.value || changed == 4) {
            donePlayers++;
        }

        if (state == "playing" && donePlayers >= stopTimerWhenDoneCountRep.value) {
            pause()
        }
    }
}
nodecg.listenFor("playerStatusChanged", checkForPause)



function tick() {
    if (state == "playing" || state == "paused") {
        timerObj.pausedMs = timer.ms()
        if (state == "playing") {
            timerObj.ms = timer.ms()
        }

        updateRep()
    }
}
setInterval(tick, 11);

function updateRep() {
    timerObj.state = state

    timerRep.value = timerObj
}
