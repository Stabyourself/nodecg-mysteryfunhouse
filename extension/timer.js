const ctx = require('./nodecg')
const nodecg = ctx.get()

const timerRep = nodecg.Replicant("timer")

const { Timer } = require('timer-node');
let timer = new Timer();
let state = "stopped"

let timerObj = {
    ms: 0,
    pausedMs: 0,
    state: "stopped",
}

updateRep()

nodecg.listenFor("timerPlay",() => {
    if (timer.isStopped() || !timer.isStarted()) {
        timer.start()
    }
    if (timer.isPaused()) {
        timer.resume()
    }

    state = "playing"
})

nodecg.listenFor("timerPause",() => {
    state = "paused"
    updateRep()
})

nodecg.listenFor("timerReset",() => {
    timer = new Timer()
    state = "stopped"

    timerObj.ms = timer.ms()
    timerObj.pausedMs = timer.ms()

    updateRep()
})

nodecg.listenFor("timerSet", (input) => {
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
})



function tick() {
    if (state == "playing" || state == "paused") {
        timerObj.pausedMs = timer.ms()
        if (state == "playing") {
            timerObj.ms = timer.ms()
        }

        updateRep()
    }
}

function updateRep() {
    timerObj.state = state

    timerRep.value = timerObj
}

setInterval(tick, 11);

