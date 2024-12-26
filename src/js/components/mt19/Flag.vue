<template>
  <div class="flag">
    <img :src="flag" v-if="code != ''" />
  </div>
</template>

<style scoped lang="scss">
.flag {
  display: inline-block;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &::before {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
    display: block;
    box-sizing: border-box;
    background-image: linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(39, 39, 39, 0.11) 11%,
      rgba(255, 255, 255, 0.15) 27%,
      rgba(0, 0, 0, 0.12) 41%,
      rgba(0, 0, 0, 0.27) 52%,
      rgba(255, 255, 255, 0.13) 63%,
      rgba(0, 0, 0, 0.13) 74%,
      rgba(255, 255, 255, 0.15) 100%
    );
  }
}
</style>

<script>
export default {
  props: ['code'],
  computed: {
    flag() {
      return `/bundles/nodecg-mysteryfunhouse/dist/img/flags/${this.code}`;
    },
  },
};
</script>
