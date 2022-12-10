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
  height: 200px;
  max-width: 1500px;

  line-height: 1;
}
</style>

<script>
export default {
  props: ["imgUrl"],
};
</script>
