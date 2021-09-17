<template>
    <v-app>
        <v-main>
            <v-container>
                <v-text-field
                    class="timer"
                    v-model="timerText"
                    :hint="timerPaused ? 'Press enter to apply' : ''"
                    @keydown.enter="applyTime"
                    :readonly="!timerPaused"
                >
                </v-text-field>

                <v-row>
                    <v-col>
                        <v-btn
                            color="success"
                            elevation="2"
                            @click="play"
                            block
                            :disabled="!timerPaused"
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
                            :disabled="timerPaused"
                        >
                            <v-icon dark>
                                mdi-pause
                            </v-icon>
                        </v-btn>
                    </v-col>

                    <v-col>
                        <v-btn
                            color="error"
                            elevation="2"
                            @click="reset"
                            block
                            :disabled="timerTime == 0"
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
            console.log(this.newTime)
            if (this.newTime) {
                nodecg.sendMessage("timerSet", this.newTime)
            }
            event.target.blur()
        }
    },

    mounted() {
        bindReplicant.call(this, "timerTime")
        bindReplicant.call(this, "timerPaused")
    },

    computed: {
        timerText: {
            get() {
                return formatTimer(this.timerTime)
            },
            set(newValue) {
                this.newTime = newValue
            }
        }
    },

    data() {
        return {
            timerTime: 0,
            timerPaused: true,
            newTime: null,
        };
    },
};
</script>