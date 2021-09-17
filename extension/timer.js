const ctx = require('./nodecg')
const nodecg = ctx.get()

const timeRep = nodecg.Replicant("timerTime")
const pausedRep = nodecg.Replicant("timerPaused")

const { Timer } = require('timer-node');
let timer = new Timer();
let paused = true

updateRep()

nodecg.listenFor("timerPlay",() => {
    if (timer.isStopped() || !timer.isStarted()) {
        timer.start()
    }
    if (timer.isPaused()) {
        timer.resume()
    }

    paused = false
})

nodecg.listenFor("timerPause",() => {
    paused = true;
    updateRep()
})

nodecg.listenFor("timerReset",() => {
    timer = new Timer()
    paused = true
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
    paused = true;

    updateRep()
})



function tick() {
    if (!paused) {
        updateRep()
    }
}

function updateRep() {
    timeRep.value = timer.ms()
    pausedRep.value = !timer.isStarted() || timer.isStopped() || timer.isPaused() || paused
}

setInterval(tick, 11);

