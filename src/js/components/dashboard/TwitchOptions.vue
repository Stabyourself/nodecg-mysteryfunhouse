<template>
  <v-app>
    <v-main>
      <v-container>
        <!-- same bar as <srl-live> on the other panels -->
        <div v-if="status.live" class="srl-live" title="The channel is live on Twitch">
          <span class="dot"></span>
          Live
        </div>

        <v-card class="mb-3" variant="tonal">
          <v-card-text>
            <div v-if="!status.live" class="mb-2">
              <v-chip v-if="status.connected" size="small">Offline</v-chip>
              <v-chip v-else color="warning" size="small">Not connected</v-chip>
            </div>

            <div><v-icon icon="mdi-format-title"></v-icon> {{ status.title || '—' }}</div>
            <div><v-icon icon="mdi-controller-classic"></v-icon> {{ status.game || '—' }}</div>

            <div v-if="status.error" class="text-error mt-2">{{ status.error }}</div>
          </v-card-text>
        </v-card>

        <v-switch
          v-model="twitchAuto"
          color="primary"
          density="compact"
          hide-details
          class="mb-3"
          label="Update when game or players change"
        ></v-switch>

        <!-- everything below is by hand -->
        <v-divider class="mb-4"></v-divider>

        <v-textarea v-model="twitchTemplate" label="Stream Title Template" rows="3"> </v-textarea>

        <v-row>
          <v-col>
            <v-btn class="mb-3" color="error" size="small" block append-icon="mdi-undo" @click="resetTemplate">
              Reset
            </v-btn>
          </v-col>

          <v-col>
            <v-btn size="small" block variant="outlined" color="info" append-icon="mdi-help" @click="toggleHelp">
              Help
            </v-btn>
          </v-col>
        </v-row>

        <div v-if="helpVisible" class="mb-3">
          The following placeholders are available:
          <ul>
            <li>{tournament} (the selected event)</li>
            <li>{game}</li>
            <li>{player1}</li>
            <li>{player2}</li>
            <li>{player3}</li>
            <li>{player4}</li>
            <li>{round1}</li>
            <li>{round2}</li>
          </ul>
          The game category is the Twitch one closest to the game, Retro if there's none.
        </div>

        <v-btn class="mb-3" color="primary" block @click="updateTwitch" :loading="updating"> Apply Stream Title </v-btn>

        <span v-if="error" class="text-error">{{ error }}</span>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from '../../util.js';

export default {
  created() {
    bindReplicant.call(this, 'twitchTemplate');
    bindReplicant.call(this, 'twitchAuto');

    // read only, twitch.js keeps it
    nodecg.Replicant('twitchStatus').on('change', (value) => {
      if (value) this.status = value;
    });
  },

  methods: {
    resetTemplate() {
      // keep in sync with DEFAULT_TEMPLATE in extension/twitch.js
      this.twitchTemplate = '{tournament}! {player1} vs. {player2}';
    },

    updateTwitch() {
      this.updating = true;

      nodecg
        .sendMessage('updateTwitch')
        .then(() => {
          this.updating = false;
          this.error = null;
        })
        .catch((error) => {
          this.updating = false;
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
      twitchTemplate: '',
      twitchAuto: true,
      status: { connected: false, live: false, title: '', game: '', error: null },
      helpVisible: false,
    };
  },
};
</script>
