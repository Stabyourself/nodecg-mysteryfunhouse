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

                <v-text-field
                    v-model="twitch"
                    label="Twitch"
                    prefix="twitch.tv/"
                ></v-text-field>

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

                <v-text-field
                    v-model="finalTime"
                    label="Final time"
                ></v-text-field>

                <v-row>
                    <v-col>
                        <v-switch v-model="done" label="Is done"></v-switch>
                    </v-col>
                    <v-col>
                        <v-switch v-model="forfeit" label="Has forfeited"></v-switch>
                    </v-col>
                </v-row>

                <v-btn color="success" elevation="2" block class="mb-3" @click="makeDone"
                :disabled="done">
                    .done
                    <v-icon right dark>
                        mdi-flag-checkered
                    </v-icon>
                </v-btn>

                <v-btn color="error" elevation="2" block class="mb-3" @click="makeForfeit"
                :disabled="forfeit">
                    .forfeit
                    <v-icon right dark>
                        mdi-cancel
                    </v-icon>
                </v-btn>

                <v-btn color="warning" elevation="2" block @click="makeUndone"
                    :disabled="!done && !forfeit">
                    .undone
                    <v-icon right dark>
                        mdi-undo
                    </v-icon>
                </v-btn>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant, formatTimer } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "name", this.makeName("name"))
        bindReplicant.call(this, "pronouns", this.makeName("pronouns"))
        bindReplicant.call(this, "twitch", this.makeName("twitch"))
        bindReplicant.call(this, "volume", this.makeName("volume"))
        bindReplicant.call(this, "done", this.makeName("done"))
        bindReplicant.call(this, "forfeit", this.makeName("forfeit"))
        bindReplicant.call(this, "finalTime", this.makeName("finalTime"))
    },

    methods: {
        makeName(name) {
            return "player" + this.playerNumber + name
        },

        makeDone() {
            this.done = true
            this.forfeit = false
            nodecg.readReplicant("timer", timer => {
                this.finalTime = formatTimer(timer.time, false, false)
            })
        },

        makeForfeit() {
            this.done = false
            this.forfeit = true

            nodecg.readReplicant("timer", timer => {
                this.finalTime = formatTimer(timer.time, false, false)
            })
        },

        makeUndone() {
            this.done = false
            this.forfeit = false
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
            volume: 0,
            done: false,
            forfeit: false,
            finalTime: "00:00:00.000",

            pronounOptions: ["", "He/Him", "She/Her", "They/Them"],
        }
    }
};
</script>