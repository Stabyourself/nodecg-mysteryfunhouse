<template>
  <v-app>
    <v-main>
      <v-tabs v-model="tab" centered background-color="transparent" show-arrows>
        <v-tabs-slider color="primary"></v-tabs-slider>

        <v-tab>Firefox sucks</v-tab>
        <v-tab v-for="info in playerInfo" :key="info.name">
          {{ info.name }}
        </v-tab>
      </v-tabs>

      <v-tabs-items v-model="tab">
        <v-tab-item style="width: 500px" class="mx-auto my-4 text-center"
          ><p>
            This tab is just here because Firefox has a bug that makes it error
            if I try to render to a canvas in an invisible iframe, like this
            one!
          </p>
          <p>
            But they'll probably fix it soon. It's only been known for
            <a
              target="_blank"
              href="https://bugzilla.mozilla.org/show_bug.cgi?id=941146"
              >over 8 years</a
            >.
          </p></v-tab-item
        >
        <v-tab-item
          class="text-center"
          v-for="info in playerInfo"
          :key="info.name"
        >
          <div class="player-card-preview" v-tilt>
            <player-card :info="info"></player-card>
          </div>
        </v-tab-item>
      </v-tabs-items>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.player-card-preview {
  height: 750px;
  padding: 3em;
  display: inline-block;

  canvas {
    height: 100%;
  }
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  mounted() {
    bindReplicant.call(this, "playerInfo");
  },

  data() {
    return {
      playerInfo: [],
      tab: null,
    };
  },
};
</script>
