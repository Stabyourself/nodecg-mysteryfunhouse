<template>
    <v-app align="center">
        <v-container>
            <p>Enter a challonge match ID to import those racers. The match ID is on the left of each pairing. This will override the current names and stuff!</p>
            <p>Where to find this ID:</p>
            <img style="align-self: center" src="img/challonge_match.png">

            <v-row style="width:330px; margin: 1em auto 0 auto">
                <v-col>
                    <v-text-field
                        v-model="matchId"
                        style="flex: 0 1 auto;"
                        label="Match ID"
                    >
                    </v-text-field>
                </v-col>

                <v-col>
                    <v-btn color="green" style="margin-top: 13px;" @click="loadMatch" :loading="loading">Load Match</v-btn>
                </v-col>
            </v-row>

            <span v-if="error" class="error--text">{{ error }}</span>
            <span v-if="success" class="success--text">{{ success }}</span>
        </v-container>
    </v-app>
</template>

<script>
export default {
    methods: {
        loadMatch() {
            let matchIdInt = parseInt(this.matchId)

            if (matchIdInt) {
                this.error = null
                this.success = null
                this.loading = true

                nodecg.sendMessage('loadMatch', matchIdInt)
                    .then((matchup) => {
                        this.loading = false
                        this.success = `Success! ${matchup}`
                    }).catch(error => {
                        this.loading = false
                        this.error = error.message
                    });
            } else {
                this.error = "Invalid Match ID. It should be 1-3 digits long."
            }
        }
    },

    data() {
        return {
            matchId: "",
            loading: false,
            error: null,
            success: null,
        }
    }
};
</script>