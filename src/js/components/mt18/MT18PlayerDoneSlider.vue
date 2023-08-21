<template>
  <div class="wrapper">
    <div class="slider" :class="[state, { up: direction == 'up' }]">
      <div class="icon">
        <img :src="stateImage" />
      </div>
      <div>
        {{ finalTime }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$whiteBoxFont: 'Arvo', serif;

.icon {
  height: 80%;
  margin-right: 1rem;

  img {
    image-rendering: pixelated;
    height: 100%;
    display: block;
  }
}

.wrapper {
  height: 60px;
  position: absolute;
  overflow: hidden;
  position: absolute;
}

.slider {
  font-size: 4rem;
  padding: 0px 4px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  color: white;
  font-weight: bold;
  text-transform: uppercase;
  background: rgb(0, 113, 164);
  background: linear-gradient(135deg, rgba(0, 113, 164, 0.6) 0%, rgba(3, 30, 47, 0.6) 80%);

  transform: translateY(-60px);
  transition: transform 0.3s;

  &.up {
    transform: translateY(60px);
  }

  &.winner,
  &.loser,
  &.forfeit {
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
      if (newState != 'none') {
        this.stateImage = this.images[newState];
      }
    },
  },

  data() {
    return {
      images: {
        winner: '/bundles/nodecg-mysteryfunhouse/dist/img/winner.png',
        loser: '/bundles/nodecg-mysteryfunhouse/dist/img/loser.png',
        forfeit: '/bundles/nodecg-mysteryfunhouse/dist/img/forfeit.png',
      },
      stateImage: '',
    };
  },
};
</script>
