<template>
    <v-app>
        <v-main>
            <v-container>
                <v-text-field
                    v-model="name"
                    label="Name"
                ></v-text-field>

                <v-combobox
                    v-model="pronouns"
                    :items="pronounOptions"
                    label="Pronouns"
                    hint="This is also a free input"
                ></v-combobox>

                <v-divider class="my-7"></v-divider>

                <v-text-field
                    v-model="twitch"
                    label="Twitch"
                    prefix="twitch.tv/"
                ></v-text-field>

                <!--
                <v-select
                    label="Quality"
                    v-model="quality"
                    :items="qualities"
                    item-text="name"
                    item-value="group"
                ></v-select>
                -->


                <v-slider
                    v-model="volume"
                    label="Volume"
                    min="0"
                    max="100"
                >
                    <template v-slot:append>
                        <v-text-field
                        v-model="volume"
                        class="mt-0 pt-0"
                        type="number"
                        style="width: 45px"
                        min="0"
                        max="100"
                        step="5"
                        ></v-text-field>
                    </template>
                </v-slider>

                <v-row>
                    <v-col>
                        <v-btn :color="streamHidden ? 'green' : 'red'" elevation="2" block class="mb-3" @click="streamHidden = !streamHidden">
                            {{ streamHidden ? "Show" : "Hide" }}
                            <v-icon right dark>
                            {{ streamHidden ? "mdi-eye" : "mdi-eye-off" }}
                            </v-icon>
                        </v-btn>
                    </v-col>

                    <v-col>
                        <v-btn color="red" elevation="2" block class="mb-3" @click="reloadStream">
                            Reload
                            <v-icon right dark>
                                mdi-refresh
                            </v-icon>
                        </v-btn>
                    </v-col>
                </v-row>


                <v-divider class="my-7"></v-divider>

                <v-btn color="green" elevation="2" block class="mb-3" @click="makeDone"
                :disabled="done">
                    .done
                    <v-icon right dark>
                        mdi-flag-checkered
                    </v-icon>
                </v-btn>

                <v-btn color="red" elevation="2" block class="mb-3" @click="makeForfeit"
                :disabled="forfeit">
                    .forfeit
                    <v-icon right dark>
                        mdi-cancel
                    </v-icon>
                </v-btn>

                <v-btn color="orange" elevation="2" block @click="makeUndone"
                    :disabled="!done && !forfeit">
                    .undone
                    <v-icon right dark>
                        mdi-undo
                    </v-icon>
                </v-btn>

                <v-row>
                    <v-col>
                        <v-switch v-model="done" label="Is done"></v-switch>
                    </v-col>
                    <v-col>
                        <v-switch v-model="forfeit" label="Forfeited"></v-switch>
                    </v-col>
                </v-row>

                <v-text-field
                    v-model="finalTime"
                    label="Final time"
                ></v-text-field>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant, formatTimer } from "../../util.js"

export default {
    created() {
        bindReplicant.call(this, "name", this.makeName("name"))
        bindReplicant.call(this, "pronouns", this.makeName("pronouns"))

        bindReplicant.call(this, "twitch", this.makeName("twitch"), 1000)
        // bindReplicant.call(this, "qualities", this.makeName("qualities"))
        //bindReplicant.call(this, "quality", this.makeName("quality"))
        bindReplicant.call(this, "volume", this.makeName("volume"))
        bindReplicant.call(this, "streamHidden", this.makeName("streamHidden"), 0)

        bindReplicant.call(this, "done", this.makeName("done"), 0)
        bindReplicant.call(this, "forfeit", this.makeName("forfeit"), 0)
        bindReplicant.call(this, "finalTime", this.makeName("finalTime"), 0)

    },

    methods: {
        makeName(name) {
            return "player" + this.playerNumber + name
        },

        makeDone() {
            this.done = true
            this.forfeit = false

            nodecg.readReplicant("timer", timer => {
                this.finalTime = formatTimer(timer.ms, false, false)
            })

            nodecg.sendMessage("playerStatusChanged", this.playerNumber)
        },

        makeForfeit() {
            this.done = false
            this.forfeit = true

            nodecg.readReplicant("timer", timer => {
                this.finalTime = formatTimer(timer.ms, false, false)
            })

            nodecg.sendMessage("playerStatusChanged", this.playerNumber)
        },

        makeUndone() {
            this.done = false
            this.forfeit = false
        },

        reloadStream() {
            nodecg.sendMessage(`stream${this.playerNumber}reload`)
        }
    },

    props: [
        "player-number"
    ],

    data() {
        return {
            name: "",
            pronouns: "",

            twitch: "",
            // qualities: [],
            //quality: null,
            volume: 0,
            streamHidden: false,

            done: false,
            forfeit: false,
            finalTime: "",

            pronounOptions: ["", "He/Him", "She/Her", "They/Them"],
        }
    }
};
</script>