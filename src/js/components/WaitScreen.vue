<template>
    <v-app>
        <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
        <ghost-background
            ref="scene"
            :playerCardCtx="playerCardCtx"
            :showPlayerCards="showPlayerCards"
        ></ghost-background>

        <player-card :ctx="playerCardCtx[0]" @update="canvasUpdated" :info="playerInfo[0]"></player-card>
        <player-card :ctx="playerCardCtx[1]" @update="canvasUpdated" :info="playerInfo[1]"></player-card>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "playerInfo")
        bindReplicant.call(this, "showPlayerCards")
    },

    methods: {
        canvasUpdated() {
            this.$refs.scene.update()
        }
    },

    data() {
        return {
            playerInfo: {
                players: [],
            },
            playerCardCtx: [
                document.createElement('canvas').getContext('2d'),
                document.createElement('canvas').getContext('2d'),
            ],
            showPlayerCards: false,
        }
    }
};
</script>