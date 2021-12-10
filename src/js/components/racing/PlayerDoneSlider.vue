<template>
  <div class="player-done-slider wrapper d-flex justify-center" :class="state">
    <div
      class="box d-flex align-center"
      :class="{ background, up: direction == 'up' }"
    >
      <div class="left d-flex align-center">
        <img :src="stateImage" />
      </div>
      <div class="right pixel-font">
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
    height: 100%;
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
        winner: "../dist/img/winner.png",
        loser: "../dist/img/loser.png",
        forfeit: "../dist/img/forfeit.png",
      },
      stateImage: "",
    };
  },
};
</script>
