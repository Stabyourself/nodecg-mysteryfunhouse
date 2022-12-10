<template>
  <div class="game-box">
    <slot name="boxart"></slot>

    <div class="text">
      <slot name="text"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.game-box {
  position: absolute;
  display: flex;
  align-items: flex-end;
  font-size: 3rem;
  height: 160px;
  max-width: 1400px;

  line-height: 1;

  img {
    max-height: 100%;
    padding-right: 10px;
  }
}
</style>

<script>
export default {
  props: ["imgUrl"],
};
</script>
