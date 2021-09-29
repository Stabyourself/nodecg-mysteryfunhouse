<template>
    <v-app>
        <v-main>
            <v-container>
                <div>
                    <v-btn @click="update" block color="primary" class="mb-3">Update</v-btn>
                </div>

                <v-row>
                    <v-col cols="3" v-for="info of infoSorted" :key="info.name">
                        <player-card class="card" :info="info"></player-card>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>
    </v-app>
</template>

<style lang="scss">
    .card canvas {
        width: 100%;
        display: block;
    }
</style>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "allInfo")
    },

    computed: {
        infoSorted() {
            return this.allInfo.sort((a, b) => {
                return a.name.localeCompare(b.name)
            })
        }
    },

    methods: {
        update() {
            nodecg.sendMessage("loadAllCards")
        }
    },

    data() {
        return {
            allInfo: []
        }
    }
};
</script>