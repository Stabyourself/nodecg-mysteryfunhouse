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

        <player-card :ctx="playerCardCtx[0]" @update="canvasUpdated" :info="playerInfo[leftCardPlayer]"></player-card>
        <player-card :ctx="playerCardCtx[1]" @update="canvasUpdated" :info="playerInfo[rightCardPlayer]"></player-card>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "playerInfo")
        bindReplicant.call(this, "showPlayerCards")
        bindReplicant.call(this, "activePlayerCards")
    },

    methods: {
        canvasUpdated() {
            this.$refs.scene.update()
        }
    },

    computed: {
        leftCardPlayer() {
            return this.activePlayerCards*2
        },
        rightCardPlayer() {
            return this.activePlayerCards*2 + 1
        },
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
            activePlayerCards: 0,
        }
    }
};
</script>