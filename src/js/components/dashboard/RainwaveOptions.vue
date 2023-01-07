<template>
  <v-app>
    <v-main>
      <v-container>
        <v-btn
          v-if="!playing || loading"
          block
          color="green"
          @click="playing = true"
          :loading="loading"
        >
          <v-icon>mdi-play</v-icon>
          Play
        </v-btn>

        <v-btn v-else block color="red" @click="playing = false">
          <v-icon>mdi-pause</v-icon>
          Pause
        </v-btn>

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

        <v-switch
          class="my-0"
          v-model="showRainwave"
          label="Show Rainwave on stream"
        ></v-switch>

        <v-select
          v-model="rainwaveId"
          :items="rainwaveIds"
          label="Rainwave station"
        >
        </v-select>
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

function randomId() {
  return Math.random().toString(36).substr(2, 9);
}

export default {
  created() {
    bindReplicant.call(this, "showRainwave", "showRainwave", 0);
    bindReplicant.call(this, "rainwaveId", "rainwaveId", 1);
  },

  watch: {
    volume(volume) {
      if (this.audio) {
        this.audio.volume = volume / 100;
      }
    },

    playing(playing) {
      if (playing) {
        this.audio = new Audio(
          `https://relay.rainwave.cc/${
            this.rainwaveIds[this.rainwaveId - 1].channel
          }.ogg?` + randomId()
        );
        this.audio.volume = this.volume / 100;
        this.audio.play();

        this.loading = true;
        this.audio.addEventListener("loadeddata", () => {
          this.loading = false;
        });
      } else {
        this.loading = false;
        this.audio.src = "";
        this.audio.pause();
        this.audio = null;
      }
    },

    rainwaveId() {
      this.playing = false;
    },
  },

  data() {
    return {
      showRainwave: false,
      audio: null,
      playing: false,
      loading: false,
      volume: 8,
      rainwaveId: 1,
      rainwaveIds: [
        {
          value: 1,
          text: "Game",
          channel: "game",
        },
        {
          value: 2,
          text: "OC Remix",
          channel: "ocremix",
        },
        {
          value: 3,
          text: "Covers",
          channel: "covers",
        },
        {
          value: 4,
          text: "Chiptune",
          channel: "chiptune",
        },
      ],
    };
  },
};
</script>
