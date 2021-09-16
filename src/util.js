export function bindReplicant(vueName, replicantName = vueName) {
    var updatingVueValue = false;
    const replicant = nodecg.Replicant(replicantName)

    NodeCG.waitForReplicants(replicant).then(() => {
        replicant.on('change', (newValue) => {
            this[vueName] = newValue
        })

        this.$watch(vueName, (newValue) => {
            if (!updatingVueValue) {
                replicant.value = newValue
            }
        });
    })
}

export function formatTimer(time) {
    let out = ""

    out += ('0' + time.h).slice(-2)
    out += ":"
    out += ('0' + time.m).slice(-2)
    out += ":"
    out += ('0' + time.s).slice(-2)
    out += "."
    out += ('00' + time.ms).slice(-3)

    return out;
}
