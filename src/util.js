export function bindReplicant(vueName, replicantName = vueName) {
    const replicant = nodecg.Replicant(replicantName)

    NodeCG.waitForReplicants(replicant).then(() => {
        this[vueName] = replicant.value

        replicant.on('change', (newValue) => {
            this[vueName] = newValue
        })

        this.$watch(vueName, (newValue) => {
            replicant.value = newValue
        });
    })
}
