<template>
  <v-app align="center">
    <v-container>
      <p>
        Enter a challonge match ID to import those players.
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon color="primary" dark v-bind="attrs" v-on="on"> mdi-help-circle </v-icon>
          </template>
          <span>The match ID of any race is the tiny number left of it!</span>
        </v-tooltip>
      </p>

      <input
        v-model="matchId"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        placeholder="000"
        class="match-id-field mx-auto d-block"
        :disabled="loadingMatchNumber !== null"
        @keydown.enter="loadMatch(1)"
      />

      <v-row class="mx-auto mt-4" dense>
        <v-col>
          <v-btn
            color="green"
            block
            :loading="loadingMatchNumber === 1"
            :disabled="loadingMatchNumber !== null"
            @click="loadMatch(1)"
          >
            Load into Match 1
          </v-btn>
        </v-col>

        <v-col>
          <v-btn
            color="green"
            block
            :loading="loadingMatchNumber === 2"
            :disabled="loadingMatchNumber !== null"
            @click="loadMatch(2)"
          >
            Load into Match 2
          </v-btn>
        </v-col>
      </v-row>

      <span v-if="error" class="error--text">{{ error }}</span>
      <span v-if="success" class="success--text">{{ success }}</span>
    </v-container>
  </v-app>
</template>

<style scoped lang="scss">
.match-id-field {
  width: 200px;
  margin-top: 24px;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
  color: inherit;
  font-size: 80px;
  line-height: 1.1;
  text-align: center;
  outline: none;

  &:focus {
    border-bottom-color: currentColor;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
  }
}
</style>

<script>
// The server bounds every external call it makes (Challonge/Sheets/Discord/DB) to 15s each,
// running them in parallel, so a successful or clean-failure response always arrives well
// under this. This is only a last-resort safety net for e.g. a dropped socket connection,
// where the server's ack would otherwise never reach us and we'd spin forever.
const RESPONSE_TIMEOUT_MS = 25000;

function timeout(ms, message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export default {
  methods: {
    loadMatch(matchNumber) {
      const matchIdInt = parseInt(this.matchId, 10);

      this.error = null;
      this.success = null;

      if (!Number.isInteger(matchIdInt) || matchIdInt <= 0) {
        this.error = 'Invalid Match ID. It should be a positive number.';
        return;
      }

      this.loadingMatchNumber = matchNumber;

      const options = {
        matchId: matchIdInt,
        matchNumber,
      };

      Promise.race([
        nodecg.sendMessage('loadMatch', options),
        timeout(
          RESPONSE_TIMEOUT_MS,
          "The server didn't respond in time. It may still be working in the background " +
            '- check the server logs, or try again in a bit.',
        ),
      ])
        .then((matchup) => {
          this.success = `Success! ${matchup}`;
        })
        .catch((error) => {
          this.error = error.message;
        })
        .finally(() => {
          this.loadingMatchNumber = null;
        });
    },
  },

  data() {
    return {
      matchId: '',
      loadingMatchNumber: null,
      error: null,
      success: null,
    };
  },
};
</script>
