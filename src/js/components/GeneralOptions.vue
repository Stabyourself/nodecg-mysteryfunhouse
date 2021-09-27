<template>
    <v-app>
        <v-main>
            <v-container>
                <v-btn
                    color="green"
                    block
                    class="mb-3"
                    nodecg-dialog="load-challonge-dialog"
                    >
                    Load from match ID
                </v-btn>

                <v-select
                    label="Wait Screen state"
                    v-model="waitScreenState"
                    :items="waitScreenStateOptions"
                >
                </v-select>

                <v-divider class="my-7"></v-divider>

                <div>
                    <h2>Player Card Status</h2>

                    <a href="#" nodecg-dialog="player-card-preview-dialog">Preview</a>

                    <ul>
                        <li v-for="(player, i) of playerInfo" :key="player.name">
                            Player {{ i+1 }}:
                            <strong>{{ player.name }}</strong>
                            <v-tooltip top v-if="!player.career">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon
                                    color="warning"
                                    dark
                                    v-bind="attrs"
                                    v-on="on"
                                    >
                                    mdi-alert
                                    </v-icon>
                                </template>
                                <span>No career info! (This is normal for new participants)</span>
                            </v-tooltip>
                        </li>
                    </ul>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "waitScreenState", "waitScreenState", 0)
        bindReplicant.call(this, "playerInfo")
    },

    data() {
        return {
            waitScreenState: false,
            waitScreenStateOptions: [
                {text: "Spinning Ghost", value: "ghost"},
                {text: "Player Cards 1 and 2", value: "cards1"},
                {text: "Player Cards 3 and 4", value: "cards2"},
            ],
            playerInfo: [],
        }
    }
};
</script>