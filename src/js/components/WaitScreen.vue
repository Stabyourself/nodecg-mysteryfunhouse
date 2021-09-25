<template>
    <v-app>
        <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
        <ghost-background
            ref="scene"
            :racerCardCtx="racerCardCtx"
        ></ghost-background>

        <racer-card :ctx="racerCardCtx[0]" @update="canvasUpdated" :info="racerCardInfo.players[0]"></racer-card>
        <racer-card :ctx="racerCardCtx[1]" @update="canvasUpdated" :info="racerCardInfo.players[1]"></racer-card>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    mounted() {
        bindReplicant.call(this, "racerCardInfo")
    },

    methods: {
        canvasUpdated() {
            this.$refs.scene.update()
        }
    },

    data() {
        return {
            racerCardInfo: {
                players: [],
            },
            racerCardCtx: [
                document.createElement('canvas').getContext('2d'),
                document.createElement('canvas').getContext('2d'),
            ]
        }
    }
};
</script>