<template>
    <div class="twitch-player"
    :style="cropStyles"></div>
</template>

<script>
const width = 930
const height = 698

let twitchOptions = {
    width: width,
    height: height,
    channel: null,
    autoplay: true,
    muted: false,
    parent: ["nodecg.guegan.de"]
}

export default {
    created() {
        nodecg.listenFor(`stream${this.playerNumber}reload`,() => {
            this.createPlayer()
        })
    },

    mounted() {
        if (this.url) {
            this.createPlayer()
        }
    },

    methods: {
        createPlayer() {
            this.$el.innerHTML = '';

            twitchOptions.channel = this.url
            this.player = new Twitch.Player(this.$el, twitchOptions)
            this.player.addEventListener(Twitch.Embed.VIDEO_READY, () => {
                this.player.setMuted(false);
                this.player.setVolume(this.volume/100);
            });
        }
    },

    computed: {
        cropStyles() {
            var left = this.crop[0]
            var top = this.crop[1]
            var right = left + this.crop[2]
            var bottom = top + this.crop[3]

            var hScale = width/this.crop[2]
            var vScale = height/this.crop[3]

            var translateX = width/2 - left - this.crop[2]/2;
            var translateY = height/2 - top - this.crop[3]/2;

            var transformOriginX = left + this.crop[2]/2
            var transformOriginY = top + this.crop[3]/2

            var scale = Math.min(hScale, vScale)

            var styles = {
                "clip": `rect(
                            ${top}px,
                            ${right}px,
                            ${bottom}px,
                            ${left}px
                        )`,
                "transform-origin": `${transformOriginX}px ${transformOriginY}px`,
                "transform": `translate(${translateX}px, ${translateY}px) scale(${scale})`,
            }

            return styles
        }
    },

    watch: {
        url() {
            this.createPlayer()
        },

        volume(newValue) {
            this.player.setVolume(newValue/100)
        }
    },

    props: [
        "url",
        "volume",
        "playerNumber",
        "crop"
    ],

    data() {
        return {
            player: null
        }
    }
};
</script>