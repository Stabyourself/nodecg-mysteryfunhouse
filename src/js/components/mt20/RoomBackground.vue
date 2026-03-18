<template>
  <div></div>
</template>

<script>
import {
  init
} from "../roomghostscene/scene.js";

export default {
  props: ["playerCardCtx", "state"],

  methods: {
    update() {
      // playerCardUpdated();
      // spin();
    },
  },

  mounted() {
    init(this.$el);
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
