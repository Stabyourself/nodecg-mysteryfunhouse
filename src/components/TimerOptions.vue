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

                <v-row>
                    <v-col>
                        <v-btn
                            color="success"
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
                            color="warning"
                            elevation="2"
                            @click="pause"
                            block
                            :disabled="timer.state != 'playing'"

                        >
                            <v-icon dark v-if="timer.state != 'paused'">
                                mdi-pause
                            </v-icon>

                            <span v-else style="font-size: 0.9em">
                                {{ pausedTimerText }}
                            </span>
                        </v-btn>
                    </v-col>

                    <v-col>
                        <v-btn
                            color="error"
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
            </v-container>
        </v-main>
    </v-app>
</template>

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
    },

    computed: {
        timerText: {
            get() {
                return formatTimer(this.timer.ms)
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
        };
    },
};
</script>