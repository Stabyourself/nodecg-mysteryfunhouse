<template>
    <div></div>
</template>

<script>
import { bindReplicant } from "../util.js"
import { init, playerCardUpdated, toPlayerCards, toGhost } from "./threejs/scene.js"

export default {
    props: [
        "playerCardCtx",
        "state"
    ],

    methods: {
        update: playerCardUpdated
    },

    mounted() {
        init(this.$el, this.playerCardCtx)
    },

    watch: {
        state(newValue) {
            if (newValue == "ghost") {
                toGhost()
            } else {
                toPlayerCards()
            }
        }
    },

    data() {
        return {

        }
    }
};
</script>
