<template>
  <div class="player-done-slider wrapper d-flex justify-center" :class="state">
    <div
      class="box d-flex align-center"
      :class="{ background, up: direction == 'up' }"
    >
      <div class="left d-flex align-center">
        <img :src="stateImage" />
      </div>
      <div class="right lcd-font">
        {{ finalTime }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.box {
  padding: 0px 4px;
  transform: translateY(-60px);
  transition: transform 0.3s;

  &.up {
    transform: translateY(60px);
  }

  .left {
    width: 60px;
    height: 60px;
    margin-right: 1em;

    img {
      image-rendering: pixelated;
      height: 80%;
    }
  }

  .right {
    font-size: 4rem;
  }

  &.background {
    background-color: rgba(0, 0, 0, 0.5);
  }
}

.player-done-slider {
  height: 60px;
  position: absolute;
  overflow: hidden;

  &.winner div,
  &.loser div,
  &.forfeit div {
    transform: translateY(0px);
  }
}
</style>

<script>
export default {
  props: {
    finalTime: String,
    state: String,
    background: Boolean,
    direction: String,
  },

  watch: {
    state: function (newState) {
      if (newState != "none") {
        this.stateImage = this.images[newState];
      }
    },
  },

  data() {
    return {
      images: {
        winner: "/bundles/nodecg-mysteryfunhouse/dist/img/winner.png",
        loser: "/bundles/nodecg-mysteryfunhouse/dist/img/loser.png",
        forfeit: "/bundles/nodecg-mysteryfunhouse/dist/img/forfeit.png",
      },
      stateImage: "",
    };
  },
};
</script>
