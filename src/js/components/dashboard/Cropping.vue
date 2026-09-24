<template>
  <v-app>
    <v-main>
      <div class="cropping-layout">
        <div class="cropping-main">
          <!-- all four stay mounted so switching keeps their frames -->
          <player-cropping v-for="i in 4" v-show="selected === i - 1" :key="i" :player="i - 1"></player-cropping>
        </div>

        <div class="cropping-previews">
          <!-- one per player so each already has its frame when you switch -->
          <crop-result v-for="i in 4" v-show="selected === i - 1" :key="'result' + i" :player="i - 1"></crop-result>

          <crop-preview
            v-for="i in 4"
            :key="i"
            :player="i - 1"
            :selected="selected === i - 1"
            @select="selected = i - 1"
          ></crop-preview>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.cropping-layout {
  display: flex;
  align-items: flex-start;
  min-height: 100vh;
}

.cropping-main {
  flex: 1 1 auto;
  min-width: 0;
}

// all four players in a 2x2 grid
.cropping-previews {
  flex: 0 0 520px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: start;
  gap: 12px;
  // the editor can be taller than the screen now, keep these in view
  position: sticky;
  top: 0;
  padding: 16px 16px 16px 0;
  box-sizing: border-box;
}
</style>

<script>
export default {
  mounted() {
    window.addEventListener('keydown', this.onKey);
  },

  beforeDestroy() {
    window.removeEventListener('keydown', this.onKey);
  },

  methods: {
    // 1-4 switches players, unless you're typing a crop value
    onKey(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

      const player = Number(event.key) - 1;
      if (player >= 0 && player < 4) this.selected = player;
    },
  },

  data() {
    return {
      selected: 0,
    };
  },
};
</script>
