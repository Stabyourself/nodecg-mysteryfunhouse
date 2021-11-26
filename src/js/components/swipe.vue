<template>
  <div class="swipe" :class="{ visible: visible }">
    <div
      class="swipe-inner"
      :class="dir"
      :style="{ 'transition-delay': delay + 's' }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss">
.swipe {
  overflow: hidden;

  .swipe-inner {
    height: 100%;
    width: 100%;

    &.up {
      transform: translateY(100%);
    }

    &.down {
      transform: translateY(-100%);
    }

    &.left {
      transform: translateX(100%);
    }

    &.right {
      transform: translateX(-100%);
    }
  }

  &:not(.visible) .swipe-inner {
    transition-delay: 0s !important;
  }

  &.visible .swipe-inner {
    transition: transform 1s;
    transform: translateY(0) translateX(0);
  }
}
</style>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: false,
    },

    dir: {
      type: String,
      default: "down",
    },

    delay: {
      type: Number,
      default: 0,
    },
  },
};
</script>
