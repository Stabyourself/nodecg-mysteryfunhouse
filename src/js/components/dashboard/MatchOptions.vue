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
    bindReplicant.call(this, "round", `match${this.matchNumber}round`);
  },

  props: ["match-number"],

  data() {
    return {
      round: "",
    };
  },
};
</script>
