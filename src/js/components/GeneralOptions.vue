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

                <div>
                    <h2>Player Card Status</h2>
                    <ul>
                        <li v-for="(player, i) of playerInfo" :key="player.name">
                            Player {{ i+1 }}:
                            {{ player.name }}
                            <strong class="green--text">Valid!</strong>
                            <span v-if="!player.career">
                                But no career info (This is normal for new participants.)
                            </span>
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
        bindReplicant.call(this, "playerInfo")
    },

    data() {
        return {
            showPlayerCards: false,
            playerInfo: [],
        }
    }
};
</script>