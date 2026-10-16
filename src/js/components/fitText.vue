<template>
  <span>
    <slot></slot>
  </span>
</template>

<script>
export default {
  props: {
    targetLineCount: {
      default: 1,
      type: Number,
    },
    unit: {
      default: 'em',
      type: String,
    },
    min: {
      default: 0.5,
      type: Number,
    },
    max: {
      default: 1,
      type: Number,
    },
  },
  data() {
    return {
      observer: null,
    };
  },
  methods: {
    calculate() {
      let element = this.$el;
      // first make it an inline block and set the line height to a fixed pixel value
      element.style.display = 'inline';
      element.style.lineHeight = '1px';

      // then keep trying untill it fits
      let fontSize = this.max;
      let stepSize = this.unit === 'px' ? 1 : 0.05;
      element.style.fontSize = fontSize + this.unit;

      while (element.getClientRects().length > this.targetLineCount && fontSize > this.min) {
        fontSize -= stepSize;
        element.style.fontSize = fontSize + this.unit;
      }
      // found it!!

      // reset the styles
      element.style.display = null;
      element.style.lineHeight = null;
    },
  },
  mounted() {
    this.timeout = setTimeout(this.calculate, 0);
    this.interval = setInterval(this.calculate, 1000);

    if ('MutationObserver' in window && this.observer === null) {
      // Create the observer (and what to do on changes...)
      this.observer = new MutationObserver(this.calculate);

      // Setup the observer. childList: a keyed child that's made anew replaces the old one
      this.observer.observe(this.$el, { subtree: true, characterData: true, childList: true });
    }
  },
  beforeUnmount: function () {
    // Clean up, keyed ones come and go with their text
    clearTimeout(this.timeout);
    clearInterval(this.interval);
    this.observer?.disconnect();
  },
};
</script>
