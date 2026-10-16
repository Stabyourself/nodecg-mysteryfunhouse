<template>
  <v-app>
    <v-main>
      <v-container>
        <srl-live :players="[(matchNumber - 1) * 2, (matchNumber - 1) * 2 + 1]"></srl-live>

        <div class="round-row mt-3">
          <v-text-field
            v-model="round"
            label="Round"
            density="compact"
          ></v-text-field>
          <v-switch
            v-model="showScore"
            label="Show score"
            color="primary"
            density="compact"
            hide-details
          ></v-switch>
        </div>

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
// the columns stay side by side, long text in them is cut off instead (the srl line)
.v-col {
  min-width: 0;
}

.round-row {
  display: flex;
  align-items: center;
  gap: 16px;

  .v-switch {
    flex: none;
  }
}

.divider {
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  padding-right: 12px;
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "round", `match${this.matchNumber}round`);
    bindReplicant.call(this, "showScore", `match${this.matchNumber}showScore`);
  },

  props: ["match-number"],

  data() {
    return {
      round: "",
      showScore: false,
    };
  },
};
</script>
