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

        <v-text-field v-model="goal" label="Goal"></v-text-field>

        <v-text-field v-model="platform" label="Platform"></v-text-field>

        <v-text-field v-model="submitter" label="Submitter"></v-text-field>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js";

document.onpaste = function (event) {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    console.log(JSON.stringify(items)); // might give you mime types
    for (var index in items) {
        var item = items[index];
        if (item.kind === 'file') {
            var blob = item.getAsFile();
            var reader = new FileReader();
            reader.onload = function (event) {
                console.log("arrayBuffer: ", event.target.result); // data url!
                nodecg.sendMessage("uploadBoxart", event.target.result);
            };
            reader.readAsDataURL(blob);
        }
    }
};

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
};
</script>
