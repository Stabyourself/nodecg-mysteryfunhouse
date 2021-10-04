<template>
    <div class="player-path" v-if="info">
        <h1>{{ apostrophe(info.name) }} matches</h1>

        <div class="timeline-wrap" ref="timelineWrap">
            <v-timeline
                v-if="info.matches.length > 0"
                dense
                light
                >
                <v-timeline-item
                v-for="match of info.matches"
                :key="match.id"
                large
                class="align-center"
                color="transparent"
                >
                    <template v-slot:icon>
                        <v-avatar>
                            <img :src="match.players[1].avatar">
                        </v-avatar>
                    </template>


                    <div class="match">
                        <div class="round">{{ match.round }}</div>
                        <div class="opponent">{{ match.players[1].name }}</div>

                        <div class="score"
                            :class="{
                                'green--text': match.winner == 0,
                                'red--text': match.winner == 1,
                            }"
                        >{{ match.score }}</div>
                    </div>

                </v-timeline-item>
            </v-timeline>

            <div v-else style="font-size: 1.5em;">
                No matches yet!
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
    .timeline-wrap {
        height: calc(100% - 40px);
        overflow-y: auto;

        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
        &::-webkit-scrollbar {
            display: none;  /* Safari and Chrome */
        }
    }
</style>

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
                let el = this.$refs.timelineWrap

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
