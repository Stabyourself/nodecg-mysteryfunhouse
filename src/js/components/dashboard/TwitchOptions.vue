<template>
  <v-app>
    <v-main>
      <v-container>
        <v-textarea
          v-model="twitchTemplate"
          label="Stream Title Template"
          rows="3"
        >
        </v-textarea>

        <v-row>
          <v-col>
            <v-btn
              class="mb-3"
              color="error"
              small
              block
              @click="resetTemplate"
            >
              Reset
              <v-icon right dark>
                mdi-undo
              </v-icon>
            </v-btn>
          </v-col>

          <v-col>
            <v-btn small block outlined color="info" @click="toggleHelp">
              Help <v-icon>mdi-help</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <div v-if="helpVisible" class="mb-3">
          The following placeholders are available:
          <ul>
            <li>{player1}</li>
            <li>{player2}</li>
            <li>{player3}</li>
            <li>{player4}</li>
            <li>{round1}</li>
            <li>{round2}</li>
          </ul>
        </div>

        <v-btn
          class="mb-3"
          color="primary"
          block
          @click="updateTwitch"
          :loading="updating"
        >
          Apply Stream Title
        </v-btn>

        <span v-if="error" class="error--text">{{ error }}</span>

        <v-card v-if="success" color="success">
          <v-card-title>Success</v-card-title>
          <v-card-text style="white-space: pre-line">
            <div><v-icon>mdi-format-title</v-icon> {{ success.title }}</div>

            <div>
              <v-icon>mdi-controller-classic</v-icon> {{ success.game }}
            </div>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "twitchTemplate");
  },

  methods: {
    resetTemplate() {
      this.twitchTemplate = "Mystery Tournament 16! {player1} vs. {player2}";
    },

    updateTwitch() {
      this.updating = true;

      nodecg
        .sendMessage("updateTwitch")
        .then((result) => {
          this.updating = false;

          this.success = result;
          this.error = null;
        })
        .catch((error) => {
          this.updating = false;

          this.success = null;
          this.error = error.message;
        });
    },

    toggleHelp() {
      this.helpVisible = !this.helpVisible;
    },
  },

  data() {
    return {
      updating: false,
      error: null,
      success: null,
      twitchTemplate: "",
      helpVisible: false,
    };
  },
};
</script>
