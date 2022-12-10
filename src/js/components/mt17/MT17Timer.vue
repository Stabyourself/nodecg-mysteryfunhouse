<template>
  <div class="timer">
    <slot></slot>
  </div>
</template>

<style scoped lang="scss">
.timer {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  // text-shadow: 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000, -3px 0 0 #000;
  font-size: 6rem;
  // color: #f58038;
  font-variant-numeric: tabular-nums lining-nums;
  transition: color 0.4s;

  &.active {
    color: #fed3b1;
  }
}
</style>

<script>
export default {};
</script>
