<template>
    <div @click="tween"></div>
</template>

<script>
import { init, racerCardUpdated, toRacerCards, toGhost } from "../../html/graphics/js/threejs/scene.js"

export default {
    props: [
        "racerCardCtx"
    ],

    methods: {
        update() {
            racerCardUpdated()
        },

        tween() {
            if (this.state == "ghost") {
                this.state = "cards"
                toRacerCards()
            } else {
                this.state = "ghost"
                toGhost()
            }
        }
    },

    mounted() {
        init(this.$el, this.racerCardCtx)
    },

    data() {
        return {
            state: "ghost"
        }
    }
};
</script>
