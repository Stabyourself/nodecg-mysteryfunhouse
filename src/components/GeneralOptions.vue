<template>
    <v-app>
        <v-theme-provider dark>
            <v-main>
                <v-container>
                    <v-text-field
                        v-model="game"
                        label="Game name"
                    ></v-text-field>

                    <v-text-field
                        v-model="goal"
                        label="Goal"
                    ></v-text-field>

                    <v-text-field
                        v-model="platform"
                        label="Platform"
                    ></v-text-field>

                    <v-text-field
                        v-model="submitter"
                        label="Submitter"
                    ></v-text-field>
                </v-container>
            </v-main>
        </v-theme-provider>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "game")
        bindReplicant.call(this, "goal")
        bindReplicant.call(this, "platform")
        bindReplicant.call(this, "submitter")
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
        }
    }
};
</script>