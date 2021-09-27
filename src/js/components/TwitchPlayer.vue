<template>
    <div class="player-backdrop">
        <div class="player-wrapper" :style="cropStyles" ref="player"></div>
    </div>
</template>

<style scoped lang="scss">
    .player-backdrop {
        background-color: black;
    }

    .player-wrapper {
        position: absolute;
    }
</style>

<script>
import { bindReplicant } from "../util.js"

const playerWidth = 930
const playerHeight = 698

let twitchOptions = {
    width: playerWidth,
    height: playerHeight,
    channel: null,
    autoplay: true,
    muted: false,
    parent: ["nodecg.guegan.de"],
    quality: "auto"
}

export default {
    created() {
        nodecg.listenFor(`stream${this.playerNumber}reload`,() => {
            this.createPlayer()
        })
        bindReplicant.call(this, "qualities", `player${this.playerNumber}qualities`)
    },

    mounted() {
        if (this.url) {
            this.createPlayer()
        }
    },

    unmounted() {
        this.$refs.player.innerHTML = '';
    },

    methods: {
        createPlayer() {
            this.$refs.player.innerHTML = '';

            twitchOptions.channel = this.url
            this.player = new Twitch.Player(this.$refs.player, twitchOptions)
            console.log("CREATING PLAYER " + this.url, this.player)
            this.player.addEventListener(Twitch.Embed.VIDEO_READY, () => {

                this.player.setMuted(false);
                this.player.setVolume(this.volume/100);

                // setInterval(() => {
                //     this.qualities = this.player.getQualities()
                // }, 5000)
            });
        }
    },

    computed: {
        cropStyles() {
            if (this.crop) {
                let left = this.crop[0]
                let right = this.crop[1]
                let top = this.crop[2]
                let bottom = this.crop[3]

                let width = playerWidth - left - right
                let height = playerHeight - top - bottom

                let hScale = playerWidth/width
                let vScale = playerHeight/height

                let translateX = Math.floor(playerWidth/2 - left - width/2)
                let translateY = Math.floor(playerHeight/2 - top - height/2)

                let transformOriginX = left + width/2
                let transformOriginY = top + height/2

                let scale = Math.min(hScale, vScale)

                let styles = {
                    "clip": `rect(
                                ${top}px,
                                ${playerWidth-right}px,
                                ${playerHeight-bottom}px,
                                ${left}px
                            )`,
                    "transform-origin": `${transformOriginX}px ${transformOriginY}px`,
                    "transform": `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                }

                return styles
            } else {
                return {}
            }
        }
    },

    watch: {
        url() {
            this.createPlayer()
        },

        volume(newValue) {
            this.player.setVolume(newValue/100)
        },

        quality(newValue) {
            // this.player.setQuality(newValue)
        }
    },

    props: [
        "url",
        "volume",
        "playerNumber",
        "crop",
        "quality",
    ],

    data() {
        return {
            player: null,
            qualities: [],
        }
    }
};
</script>