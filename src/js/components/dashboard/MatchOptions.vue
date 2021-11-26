<template>
  <v-app>
    <v-main>
      <v-container>
        <v-text-field
          v-model="round"
          label="Round"
          dense
          class="mt-3"
        ></v-text-field>

        <label>Predictions</label>
        <v-slider
          v-model="rightPrediction"
          :max="100"
          :min="0"
          color="rgba(255,255,255,.2)"
          thumb-color="primary"
        >
          <template v-slot:prepend>
            <v-text-field
              v-model="leftPrediction"
              class="mt-0 pt-0"
              type="number"
              max="100"
              min="0"
              style="width: 60px"
              dense
            ></v-text-field>
          </template>

          <template v-slot:append>
            <v-text-field
              v-model="rightPrediction"
              class="mt-0 pt-0"
              type="number"
              max="100"
              min="0"
              style="width: 60px"
              dense
            ></v-text-field>
          </template>
        </v-slider>

        <v-row>
          <v-col class="divider">
            <player-options
              :player-number="(matchNumber - 1) * 2"
            ></player-options>
          </v-col>
          <v-col>
            <player-options
              :player-number="(matchNumber - 1) * 2 + 1"
            ></player-options>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped lang="scss">
.divider {
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  padding-right: 12px;
  margin-right: 6px;
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    let leftPlayer = (this.matchNumber - 1) * 2;
    let rightPlayer = (this.matchNumber - 1) * 2 + 1;

    bindReplicant.call(this, "round", `match${this.matchNumber}round`);

    bindReplicant.call(this, "leftPrediction", `player${leftPlayer}prediction`);
    bindReplicant.call(
      this,
      "rightPrediction",
      `player${rightPlayer}prediction`
    );
  },

  props: ["match-number"],

  watch: {
    leftPrediction() {
      this.rightPrediction = 100 - this.leftPrediction;
    },

    rightPrediction() {
      this.leftPrediction = 100 - this.rightPrediction;
    },
  },

  data() {
    return {
      round: "",
      leftPrediction: 50,
      rightPrediction: 50,
    };
  },
};
</script>
