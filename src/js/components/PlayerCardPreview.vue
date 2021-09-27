<template>
    <v-app>
        <v-main>
            <v-tabs v-model="tab" centered background-color="transparent">
                <v-tabs-slider color="primary"></v-tabs-slider>

                <v-tab
                    v-for="i in 4" :key="i"
                >
                    {{ playerInfo[i-1] ? playerInfo[i-1].name : "Something went wrong!" }}
                </v-tab>
            </v-tabs>

            <v-tabs-items v-model="tab">
                <v-tab-item
                    v-for="i in 4" :key="i">
                    <player-card :info="playerInfo[i-1]" class="player-card-preview"></player-card>
                </v-tab-item>
            </v-tabs-items>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    mounted() {
        bindReplicant.call(this, "playerInfo")
    },

    watch: {
        playInfo() {
            console.log("!")
        }
    },

    data() {
        return {
            playerInfo: [],
            tab: 0,
        }
    }
};
</script>
