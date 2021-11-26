<template>
  <v-app>
    <v-main>
      <div>
        <v-btn @click="update" block color="primary" class="mb-3"
          >Update data from sheets and stuff</v-btn
        >
      </div>

      <v-row>
        <v-col
          cols="3"
          v-for="info of infoSorted"
          :key="info.name"
          class="card"
        >
          <player-card v-tilt :info="info"></player-card>
        </v-col>
      </v-row>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.card {
  &:hover {
    z-index: 1000;

    canvas {
      filter: drop-shadow(0 0 5px #000);
    }
  }

  canvas {
    width: 100%;
    display: block;
  }
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "allInfo");
  },

  computed: {
    infoSorted() {
      return this.allInfo.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    },
  },

  methods: {
    update() {
      nodecg.sendMessage("loadAllCards");
    },
  },

  data() {
    return {
      allInfo: [],
    };
  },
};
</script>
