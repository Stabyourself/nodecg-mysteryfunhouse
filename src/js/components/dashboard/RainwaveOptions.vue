<template>
  <v-app>
    <v-main>
      <v-container>
        <audio
          ref="audio"
          controls
          preload="none"
          src="https://relay.rainwave.cc/ocremix.ogg"
        ></audio>

        <v-slider v-model="volume" label="Volume" min="0" max="100">
          <template v-slot:append>
            <v-text-field
              v-model="volume"
              class="mt-0 pt-0"
              type="number"
              style="width: 45px"
              min="0"
              max="100"
              step="1"
              dense
            ></v-text-field>
          </template>
        </v-slider>

        <p>
          If you pause, the stream will fall behind. Make sure to seek to the
          end before resuming.
        </p>

        <v-switch
          v-model="showRainwave"
          label="Show Rainwave on stream"
        ></v-switch>
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
    this.$refs.audio.volume = this.volume / 100;
  },

  watch: {
    volume(newVal) {
      this.$refs.audio.volume = newVal / 100;
    },
  },

  data() {
    return {
      showRainwave: false,
      volume: 50,
    };
  },
};
</script>
