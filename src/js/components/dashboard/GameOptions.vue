<template>
  <v-app>
    <v-main>
      <v-container>
        <v-text-field v-model="game" label="Game name"></v-text-field>

        <label
          class="v-label v-label--active theme--dark"
          style="font-size:12px"
          >Boxart</label
        >
        <div class="select-img-wrap mb-3" nodecg-dialog="boxart-select-dialog">
          <img
            class="select-img"
            :src="currentBoxart ? currentBoxart.url : ''"
          />
          <div class="select-img-border"></div>
        </div>

        <v-text-field v-model="goal" label="Goal"></v-text-field>

        <v-text-field v-model="platform" label="Platform"></v-text-field>

        <v-text-field v-model="submitter" label="Submitter"></v-text-field>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "game");
    bindReplicant.call(this, "goal");
    bindReplicant.call(this, "platform");
    bindReplicant.call(this, "submitter");
    bindReplicant.call(this, "currentBoxart");

    // ???
    bindReplicant.call(this, "boxart", "assets:boxart");
  },

  computed: {
    boxartWithEmpty() {
      let modifiedBoxArts = JSON.parse(JSON.stringify(this.boxart));

      modifiedBoxArts.push({
        name: "None",
        url: "",
      });

      modifiedBoxArts.reverse();

      return modifiedBoxArts;
    },
  },

  data() {
    return {
      game: "",
      goal: "",
      platform: "",
      submitter: "",
      boxart: [],
      currentBoxart: {},
    };
  },
};
</script>
