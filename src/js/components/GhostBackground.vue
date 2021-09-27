<template>
    <div></div>
</template>

<script>
import { bindReplicant } from "../util.js"
import { init, playerCardUpdated, toPlayerCards, toGhost } from "../../html/graphics/js/threejs/scene.js"

export default {
    props: [
        "playerCardCtx",
        "showPlayerCards"
    ],

    methods: {
        update: playerCardUpdated
    },

    mounted() {
        init(this.$el, this.playerCardCtx)
    },

    watch: {
        showPlayerCards(newValue) {
            if (newValue) {
                toPlayerCards()
            } else {
                toGhost()
            }
        }
    },

    data() {
        return {

        }
    }
};
</script>
