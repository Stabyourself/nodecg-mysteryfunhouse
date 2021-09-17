var clone = require("clone")
var _ = require("lodash")

export function bindReplicant(vueName, replicantName = vueName) {
    const replicant = nodecg.Replicant(replicantName)
    let preventSend = false;

    let sendValue = _.debounce(function(newValue) {
        replicant.value = newValue
        console.log("sending!")
    }, 300);

    NodeCG.waitForReplicants(replicant).then(() => {
        replicant.on('change', (newValue) => {
            this[vueName] = clone(newValue)

            preventSend = true;
            this.$nextTick(() => {
                preventSend = false;
            })
        })

        this.$watch(vueName, (newValue) => {
            if (!preventSend) {
                sendValue(newValue)
            }
        });
    })
}

export function formatTimer(time, includeMs = true, alwaysIncludeHours = true) {
    let out = ""

    var ms = Math.floor(time % 1000),
    s = Math.floor((time / 1000) % 60),
    m = Math.floor((time / (1000 * 60)) % 60),
    h = Math.floor((time / (1000 * 60 * 60)) % 24)

    if (alwaysIncludeHours || h > 0) {
        out += ('0' + h).slice(-2)
        out += ":"
    }
    out += ('0' + m).slice(-2)
    out += ":"
    out += ('0' + s).slice(-2)

    if (includeMs) {
        out += "."
        out += ('00' + ms).slice(-3)
    }

    return out;
}
