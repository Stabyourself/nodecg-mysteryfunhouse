<template>
  <div></div>
</template>

<script>
import {
  init,
  playerCardUpdated,
  toCorkboard,
  toIdle
} from "../roomghostscene/scene.js";

export default {
  props: ["playerCardCtx", "state"],

  methods: {
    update() {
      playerCardUpdated();
    },
  },

  mounted() {
    init(this.$el, this.playerCardCtx);
  },

  watch: {
    state(newState, oldState) {
      if (newState == "cards1" || newState == "cards2") {
        toCorkboard();
      } else if (newState == "ghost") {
        toIdle();
      }
    },
  },

  data() {
    return {};
  },
};
</script>
