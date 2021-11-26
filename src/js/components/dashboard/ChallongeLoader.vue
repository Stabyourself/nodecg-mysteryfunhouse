<template>
  <v-app align="center">
    <v-container>
      <p>
        Enter a challonge match ID to import those players.
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon color="primary" dark v-bind="attrs" v-on="on">
              mdi-help-circle
            </v-icon>
          </template>
          <span>The match ID of any race is the tiny number left of it!</span>
        </v-tooltip>
      </p>

      <p class="warning--text mt-2">
        This will override the selected players!
      </p>

      <v-row class="mx-auto">
        <v-col>
          <v-text-field
            v-model="matchId"
            label="Match ID"
            @keydown.enter="loadMatch"
          >
          </v-text-field>
        </v-col>

        <v-col>
          <v-select
            v-model="matchNumber"
            :items="matchSelectOptions"
            label="Which match"
          >
          </v-select>
        </v-col>

        <v-col>
          <v-btn
            color="green"
            class="mt-3"
            block
            @click="loadMatch"
            :loading="loading"
            >Load Match</v-btn
          >
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
      let matchIdInt = parseInt(this.matchId);

      this.error = null;
      this.success = null;

      if (matchIdInt) {
        this.loading = true;

        const options = {
          matchId: matchIdInt,
          matchNumber: this.matchNumber,
        };

        nodecg
          .sendMessage("loadMatch", options)
          .then((matchup) => {
            this.loading = false;
            this.success = `Success! ${matchup}`;
          })
          .catch((error) => {
            this.loading = false;
            this.error = error.message;
          });
      } else {
        this.error = "Invalid Match ID. It should be 1-3 digits long.";
      }
    },
  },

  data() {
    return {
      matchId: "",
      loading: false,
      error: null,
      success: null,
      matchNumber: 1,
      matchSelectOptions: [
        { text: "Match 1", value: 1 },
        { text: "Match 2", value: 2 },
      ],
    };
  },
};
</script>
