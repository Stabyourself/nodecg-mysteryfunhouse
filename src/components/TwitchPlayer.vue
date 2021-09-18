<template>
    <div class="twitch-player"></div>
</template>

<script>
let twitchOptions = {
    width: 930,
    height: 698,
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
        "playerNumber"
    ],

    data() {
        return {
            player: null
        }
    }
};
</script>