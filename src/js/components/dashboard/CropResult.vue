<template>
  <div class="crop-result">
    <div class="crop-result-header">
      <span>Cropped result</span>
      <span class="crop-result-size">{{ width }} × {{ height }}</span>
    </div>

    <div class="crop-result-frame" ref="frame">
      <canvas v-show="image && width > 0 && height > 0" ref="canvas"></canvas>
      <div v-if="!image" class="crop-result-missing">No frame yet</div>
    </div>
  </div>
</template>

<style lang="scss">
.crop-result {
  grid-column: 1 / -1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #00bebe;
  background: rgba(0, 190, 190, 0.08);
}

.crop-result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
}

.crop-result-size {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
}

.crop-result-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 270px;
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.06) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px;

  canvas {
    display: block;
  }
}

.crop-result-missing {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
</style>

<script>
import { bindReplicant } from '../../util.js';

// crop values are in 1920x1080, like the editor
const CROP_W = 1920;
const CROP_H = 1080;

export default {
  props: ['player'],

  created() {
    bindReplicant.call(this, 'crop', `player${this.player}crop`);

    // the previews ask for frames, this just draws whatever shows up
    nodecg.listenFor('playerFrame', this.frameReceived);
  },

  mounted() {
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(this.$refs.frame);
  },

  beforeDestroy() {
    nodecg.unlisten('playerFrame', this.frameReceived);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  },

  watch: {
    crop: {
      deep: true,
      handler() {
        this.draw();
      },
    },
  },

  computed: {
    width() {
      return CROP_W - this.crop[0] - this.crop[1];
    },

    height() {
      return CROP_H - this.crop[2] - this.crop[3];
    },
  },

  methods: {
    frameReceived(frame) {
      if (Number(frame.player) !== Number(this.player) || frame.error) return;

      const image = new Image();
      image.onload = () => {
        this.image = image;
        this.$nextTick(() => this.draw());
      };
      image.src = frame.imageData;
    },

    // exactly the kept part of the frame, fitted into the box without changing its aspect
    draw() {
      const { canvas, frame } = this.$refs;
      if (!this.image || !canvas || this.width <= 0 || this.height <= 0) return;

      const scale = Math.min(frame.clientWidth / this.width, frame.clientHeight / this.height);
      const cssW = Math.max(1, Math.round(this.width * scale));
      const cssH = Math.max(1, Math.round(this.height * scale));
      const ratio = window.devicePixelRatio || 1;

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.round(cssW * ratio);
      canvas.height = Math.round(cssH * ratio);

      // the frame can be any resolution, crop values map onto it proportionally
      const toImageX = this.image.naturalWidth / CROP_W;
      const toImageY = this.image.naturalHeight / CROP_H;

      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        this.image,
        this.crop[0] * toImageX,
        this.crop[2] * toImageY,
        this.width * toImageX,
        this.height * toImageY,
        0,
        0,
        canvas.width,
        canvas.height
      );
    },
  },

  data() {
    return {
      crop: [0, 0, 0, 0],
      image: null,
      resizeObserver: null,
    };
  },
};
</script>
