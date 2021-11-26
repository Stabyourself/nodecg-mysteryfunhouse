<template>
  <v-app>
    <v-main>
      <v-container>
        <v-btn
          color="primary"
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

        <v-textarea label="Top text" v-model="topText" rows="3"></v-textarea>

        <v-switch v-model="showRainwave" label="Show Rainwave"></v-switch>

        <v-divider class="my-7"></v-divider>

        <div>
          <h2>Player Card Status</h2>

          <a href="#" nodecg-dialog="player-card-preview-dialog">Preview</a>

          <ul>
            <li v-for="(player, i) of playerInfo" :key="player.name">
              Player {{ i + 1 }}:
              <strong>{{ player.name }}</strong>
              <v-tooltip top v-if="!player.career">
                <template v-slot:activator="{ on, attrs }">
                  <v-icon color="warning" dark v-bind="attrs" v-on="on">
                    mdi-alert
                  </v-icon>
                </template>
                <span
                  >No career info! (This is normal for new participants)</span
                >
              </v-tooltip>
            </li>
          </ul>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "waitScreenState", "waitScreenState", 0);
    bindReplicant.call(this, "showRainwave", "showRainwave", 0);
    bindReplicant.call(this, "topText");
    bindReplicant.call(this, "playerInfo");
  },

  data() {
    return {
      waitScreenState: false,
      showRainwave: false,
      waitScreenStateOptions: [
        { text: "Spinning Ghost", value: "ghost" },
        { text: "Player Cards Match 1", value: "cards1" },
        { text: "Player Cards Match 2", value: "cards2" },
        { text: "Tournament Paths Match 1", value: "paths1" },
        { text: "Tournament Paths Match 2", value: "paths2" },
      ],
      playerInfo: [],
      topText: "",
    };
  },
};
</script>
