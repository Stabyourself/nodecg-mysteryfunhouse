<template>
    <div></div>
</template>

<script>
import { init, racerCardUpdated } from "../../html/graphics/js/threejs/scene.js"

export default {
    props: [
        "racerCardCtx"
    ],

    methods: {
        update() {
            racerCardUpdated()
        }
    },

    mounted() {
        init(this.$el, this.racerCardCtx)
    }
};
</script>
