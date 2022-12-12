<template>
  <v-app>
    <v-main>
      <v-container>
        <v-text-field v-model="game" label="Game name"></v-text-field>

        <label
          class="v-label v-label--active theme--dark"
          style="font-size: 12px"
          >Boxart</label
        >
        <div class="select-img-wrap mb-3" nodecg-dialog="boxart-select-dialog">
          <img
            class="select-img"
            :src="currentBoxart ? currentBoxart.url : ''"
          />
          <div class="select-img-border"></div>
        </div>

        <div class="d-flex">
          <v-text-field
            v-model="boxartUrl"
            label="URL"
            filled
            dense
          ></v-text-field>
          <v-btn @click="uploadBoxart" color="primary">Upload</v-btn>
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
  },

  data() {
    return {
      game: "",
      goal: "",
      platform: "",
      submitter: "",
      currentBoxart: {},
      boxartUrl: "",
    };
  },

  methods: {
    uploadBoxart() {
      nodecg.sendMessage("uploadBoxart", this.boxartUrl);
    },
  },
};
</script>
