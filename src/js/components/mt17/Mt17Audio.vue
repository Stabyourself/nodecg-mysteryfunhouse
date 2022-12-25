<template>
  <img
    src="/bundles/nodecg-mysteryfunhouse/dist/img/audio_postit.png"
    :style="{
      top: y + 'px',
      left: x + 'px',
      width: width + 'px',
      height: height + 'px',
      transform: 'rotate(' + r + 'rad)',
    }"
  />
</template>

<style scoped lang="scss">
img {
  position: absolute;
}
</style>

<script>
let maxRot = 0.1;

export default {
  props: {
    x: Number,
    y: Number,
    size: Number,
  },

  data() {
    return {
      width: this.size ?? 100,
      height: this.size ?? 100,
      r: Math.random() * maxRot * 2 - maxRot,
    };
  },
};
</script>
