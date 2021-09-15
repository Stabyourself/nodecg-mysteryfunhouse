<template>
    <v-app>
        <v-theme-provider dark>
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
                        step="10"
                        ></v-text-field>
                    </template>
                    </v-slider>

                    <v-row>
                        <v-col>
                            <v-switch v-model="done" label="Is done"></v-switch>
                        </v-col>
                        <v-col>
                            <v-switch v-model="forfeit" label="Has forfeited"></v-switch>
                        </v-col>
                    </v-row>

                    <v-btn color="success" elevation="2">
                        .done
                        <v-icon right dark>
                            mdi-flag-checkered
                        </v-icon>
                    </v-btn>

                    <v-btn
                        color="error"
                        elevation="2"
                    >.forfeit
                        <v-icon
                            right
                            dark
                        >
                            mdi-cancel
                        </v-icon>
                    </v-btn>
                </v-container>
            </v-main>
        </v-theme-provider>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "name", this.makeName("name"))
        bindReplicant.call(this, "pronouns", this.makeName("pronouns"))
        bindReplicant.call(this, "twitch", this.makeName("twitch"))
        bindReplicant.call(this, "volume", this.makeName("volume"))
        bindReplicant.call(this, "done", this.makeName("done"))
        bindReplicant.call(this, "forfeit", this.makeName("forfeit"))
    },

    methods: {
        makeName(name) {
            return "player" + this.playerNumber + name
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

            pronounOptions: ["", "He/Him", "She/Her", "They/Them"],
        }
    }
};
</script>