<template>
    <v-app>
        <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
        <ghost-background
            ref="scene"
            :playerCardCtx="playerCardCtx"
            :state="waitScreenState"
        ></ghost-background>

        <player-card :use-ctx="playerCardCtx[0]" @update="canvasUpdated" :info="leftPlayerInfo"></player-card>
        <player-card :use-ctx="playerCardCtx[1]" @update="canvasUpdated" :info="rightPlayerInfo"></player-card>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "playerInfo")
        bindReplicant.call(this, "waitScreenState")
    },

    methods: {
        canvasUpdated() {
            this.$refs.scene.update()
        }
    },

    watch: {
        waitScreenState(newValue) {
            if (newValue == "cards1") {
                this.leftPlayerInfo = this.playerInfo[0]
                this.rightPlayerInfo = this.playerInfo[1]
            } else if (newValue == "cards2") {
                this.leftPlayerInfo = this.playerInfo[2]
                this.rightPlayerInfo = this.playerInfo[3]
            }
        }
    },

    data() {
        return {
            playerInfo: [],
            playerCardCtx: [
                document.createElement('canvas').getContext('2d'),
                document.createElement('canvas').getContext('2d'),
            ],
            waitScreenState: "ghost",

            leftPlayerInfo: null,
            rightPlayerInfo: null,
        }
    }
};
</script>