<template>
    <v-app>
        <v-main>
            <v-container>
                <v-text-field
                    class="timer"
                    v-model="timerText"
                    :hint="timer.state != 'playing' ? 'Press enter to apply' : ''"
                    @keydown.enter="applyTime"
                    :readonly="timer.state == 'playing'"
                >
                </v-text-field>

                <div style="text-align: center;" class="grey--text">
                    <span v-if="timer.state == 'paused'">{{ pausedTimerText }}</span>
                    <span v-else>&nbsp;</span>
                </div>

                <v-row>
                    <v-col>
                        <v-btn
                            color="green"
                            elevation="2"
                            @click="play"
                            block
                            :disabled="timer.state == 'playing'"
                        >
                            <v-icon dark>
                                mdi-play
                            </v-icon>
                        </v-btn>
                    </v-col>

                    <v-col>
                        <v-btn
                            color="orange"
                            elevation="2"
                            @click="pause"
                            block
                            :disabled="timer.state != 'playing'"

                        >
                            <v-icon dark>
                                mdi-pause
                            </v-icon>
                        </v-btn>
                    </v-col>

                    <v-col>
                        <v-btn
                            color="red"
                            elevation="2"
                            @click="reset"
                            block
                            :disabled="timer.ms == 0"
                        >
                            <v-icon dark>
                                mdi-undo
                            </v-icon>
                        </v-btn>
                    </v-col>
                </v-row>


                <v-switch v-model="stopTimerWhenDone"
                    class="d-inline-block"></v-switch>
                Halt after
                <v-select
                    v-model="stopTimerWhenDoneCount"
                    :items="playerCounts"
                    class="d-inline-block"
                    style="width: 45px"
                    dense
                ></v-select>
                {{ stopTimerWhenDoneCount==1?"finish":"finishes"}}
            </v-container>
        </v-main>
    </v-app>
</template>

<style lang="scss">
    .timer.v-input {
        padding-top: 0;
        margin-top: 0;

        input {
            font-size: 3.87em;
            font-weight: 700;
            max-height: none;
            padding: 0;
        }
    }
</style>

<script>
import { bindReplicant, formatTimer } from "../util.js"

export default {
    methods: {
        play() {
            nodecg.sendMessage("timerPlay")
        },

        pause() {
            nodecg.sendMessage("timerPause")
        },

        reset() {
            nodecg.sendMessage("timerReset")
        },

        applyTime(event) {
            if (this.newTime) {
                nodecg.sendMessage("timerSet", this.newTime)
            }
            event.target.blur()
        }
    },

    created() {
        bindReplicant.call(this, "timer")
        bindReplicant.call(this, "stopTimerWhenDone")
        bindReplicant.call(this, "stopTimerWhenDoneCount", "stopTimerWhenDoneCount", 0)
    },

    computed: {
        timerText: {
            get() {
                return formatTimer(this.timer.ms, false)
            },
            set(newValue) {
                this.newTime = newValue
            }
        },

        pausedTimerText() {
            return formatTimer(this.timer.pausedMs)
        }
    },

    data() {
        return {
            timer: 0,
            newTime: null,
            playerCounts: [1, 2, 3, 4],
            stopTimerWhenDone: true,
            stopTimerWhenDoneCount: 2,
        };
    },
};
</script>