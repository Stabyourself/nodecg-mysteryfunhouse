<template>
  <div></div>
</template>

<script>
import {
  init,
  playerCardUpdated,
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
    // state(newState, oldState) {
    //   if (newState == "ghost") {
    //     toGhost();
    //   } else if (newState == "cards1" || newState == "cards2") {
    //     toPlayerCards();
    //   } else if (newState == "paths1" || newState == "paths2") {
    //     toPaths();
    //   }
    // },
  },

  data() {
    return {};
  },
};
</script>
