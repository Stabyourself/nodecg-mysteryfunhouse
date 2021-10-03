<template>
    <div class="player-path" v-if="info">
        <h1>{{ apostrophe(info.name) }} matches</h1>

        <match-history-match v-for="match of info.matches" :key="match.id"
            :match="match">
        </match-history-match>
    </div>
</template>

<script>
import { apostrophe } from "../../util.js"

export default {
    props: [
        "info"
    ],

    methods: {
        apostrophe,
        animateScroll() {
            clearInterval(this.interval)

            setTimeout(() => {
                let el = this.$el

                if (el.scrollTo) {
                    var height = el.scrollHeight - el.offsetHeight;

                    if (height > 0) {
                        var currentHeight = 0;
                        var bool = true;
                        var step = 0.5;
                        var speed = 1/60;
                        this.interval = setInterval(scrollpage, speed)

                        function scrollpage() {
                            if (currentHeight < -200 || currentHeight > height + 200)
                                bool = !bool;
                            if (bool) {
                                el.scrollTo(0, currentHeight += step);
                            } else {
                                // if you don't want to continue scroll
                                // clearInterval(interval) use clearInterval
                                el.scrollTo(0, currentHeight -= step);
                            }
                        }
                    }
                }
            }, 0)

        }
    },

    watch: {
        info() {
            this.animateScroll()
        }
    },

    data() {
        return {
            interval: null
        }
    }
};
</script>
