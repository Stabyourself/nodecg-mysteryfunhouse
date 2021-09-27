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
                    label="Active player cards"
                    v-model="activePlayerCards"
                    :items="activePlayerCardsOptions"
                >
                </v-select>

                <v-btn
                    :color="showPlayerCards ? 'red' : 'green'"
                    block
                    class="mb-3"
                    @click="togglePlayerCards"
                    >
                    <span v-if="showPlayerCards">
                        Hide Playercards
                    </span>

                    <span v-else>
                        Show Playercards
                    </span>
                </v-btn>

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
    methods: {
        togglePlayerCards() {
            this.showPlayerCards = !this.showPlayerCards
        },
    },

    created() {
        bindReplicant.call(this, "showPlayerCards", "showPlayerCards", 0)
        bindReplicant.call(this, "activePlayerCards", "activePlayerCards", 0)
        bindReplicant.call(this, "playerInfo")
    },

    data() {
        return {
            showPlayerCards: false,
            activePlayerCards: 0,
            activePlayerCardsOptions: [
                {text: "Players 1 and 2", value: 0},
                {text: "Players 3 and 4", value: 1},
            ],
            playerInfo: [],
        }
    }
};
</script>