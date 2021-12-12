<template>
  <v-app>
    <v-main>
      <v-container>
        <audio
          ref="audio"
          controls
          src="http://ocrstream.rainwave.cc:8000/ocremix.mp3"
        ></audio>

        <v-switch v-model="showRainwave" label="Show Rainwave Info"></v-switch>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped lang="scss">
audio {
  width: 100%;
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "showRainwave", "showRainwave", 0);
  },

  mounted() {
    this.$refs["audio"].volume = 0.5;
  },

  data() {
    return {
      showRainwave: false,
    };
  },
};
</script>
