<template>
  <div class="crop-preview" :class="{ selected }" @click="$emit('select')">
    <div class="crop-preview-header">
      <span class="crop-preview-title">
        <span class="crop-preview-number">{{ player + 1 }}</span>
        {{ name || `Player ${player + 1}` }}
      </span>

      <v-btn icon x-small :loading="waitingForFrame" title="New frame" @click.stop="requestFrame">
        <v-icon small>mdi-camera</v-icon>
      </v-btn>
    </div>

    <div class="crop-preview-frame">
      <img v-if="frameSrc" :src="frameSrc" />
      <div v-else class="crop-preview-missing">{{ frameError || 'No frame yet' }}</div>

      <div class="crop-preview-box" :style="boxStyle"></div>
    </div>

    <div class="crop-preview-values">
      <span><v-icon x-small>mdi-arrow-left</v-icon>{{ crop[0] }}</span>
      <span><v-icon x-small>mdi-arrow-right</v-icon>{{ crop[1] }}</span>
      <span><v-icon x-small>mdi-arrow-up</v-icon>{{ crop[2] }}</span>
      <span><v-icon x-small>mdi-arrow-down</v-icon>{{ crop[3] }}</span>
    </div>
  </div>
</template>

<style lang="scss">
.crop-preview {
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  min-width: 0;

  &:hover {
    border-color: rgba(255, 255, 255, 0.35);
  }

  &.selected {
    cursor: default;
    border-color: #00bebe;
    background: rgba(0, 190, 190, 0.08);
  }
}

.crop-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.crop-preview-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crop-preview-number {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  line-height: 18px;
  border-radius: 50%;
  text-align: center;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);

  .selected & {
    background: #00bebe;
    color: #000;
  }
}

.crop-preview-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);

  img {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
    -webkit-user-drag: none;
  }
}

.crop-preview-missing {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.3);
}

// everything outside the crop gets washed out. the outline sits outside the box, on cropped pixels,
// so everything inside it is exactly what stays visible
.crop-preview-box {
  position: absolute;
  box-shadow: 0 0 0 2px #00bebe, 0 0 0 3px rgba(0, 0, 0, 0.7), 0 0 0 9999px rgba(255, 255, 255, 0.6);
  pointer-events: none;
}

.crop-preview-values {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
</style>

<script>
import { bindReplicant } from '../../util.js';

const CROP_W = 1920;
const CROP_H = 1080;
const FRAME_TIMEOUT = 5000;

export default {
  props: ['player', 'selected'],

  created() {
    bindReplicant.call(this, 'crop', `player${this.player}crop`);
    bindReplicant.call(this, 'name', `player${this.player}name`);

    // frames the editor asks for show up here too
    nodecg.listenFor('playerFrame', this.frameReceived);
  },

  mounted() {
    this.requestFrame();
  },

  beforeDestroy() {
    nodecg.unlisten('playerFrame', this.frameReceived);
    clearTimeout(this.frameTimer);
  },

  computed: {
    boxStyle() {
      return {
        left: (this.crop[0] / CROP_W) * 100 + '%',
        right: (this.crop[1] / CROP_W) * 100 + '%',
        top: (this.crop[2] / CROP_H) * 100 + '%',
        bottom: (this.crop[3] / CROP_H) * 100 + '%',
      };
    },
  },

  methods: {
    requestFrame() {
      this.waitingForFrame = true;
      this.frameError = '';
      this.lastFrameError = '';

      nodecg.sendMessage('requestPlayerFrame', { player: Number(this.player) });

      clearTimeout(this.frameTimer);
      this.frameTimer = setTimeout(() => {
        if (!this.waitingForFrame) return;
        this.waitingForFrame = false;
        this.frameError = this.lastFrameError || 'No answer from OBS';
      }, FRAME_TIMEOUT);
    },

    frameReceived(frame) {
      if (Number(frame.player) !== Number(this.player)) return;

      // several pages answer, see PlayerCropping
      if (frame.error) {
        this.lastFrameError = frame.error;
        return;
      }

      this.waitingForFrame = false;
      clearTimeout(this.frameTimer);

      this.frameSrc = frame.imageData;
    },
  },

  data() {
    return {
      crop: [0, 0, 0, 0],
      name: '',
      frameSrc: '',
      frameError: '',
      lastFrameError: '',
      waitingForFrame: false,
      frameTimer: null,
    };
  },
};
</script>
