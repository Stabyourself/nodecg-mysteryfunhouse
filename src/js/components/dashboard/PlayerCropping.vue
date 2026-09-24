<template>
  <div>
    <div class="crop-toolbar" :style="{ width: previewW + 'px' }">
      <v-text-field
        class="crop-input"
        v-model.number="crop[0]"
        label="Left"
        type="number"
        prepend-inner-icon="mdi-arrow-left"
        min="0"
        max="1920"
        dense
        outlined
        hide-details
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[1]"
        label="Right"
        type="number"
        prepend-inner-icon="mdi-arrow-right"
        min="0"
        max="1920"
        dense
        outlined
        hide-details
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[2]"
        label="Top"
        type="number"
        prepend-inner-icon="mdi-arrow-up"
        min="0"
        max="1080"
        dense
        outlined
        hide-details
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[3]"
        label="Bottom"
        type="number"
        prepend-inner-icon="mdi-arrow-down"
        min="0"
        max="1080"
        dense
        outlined
        hide-details
      ></v-text-field>

      <div class="crop-toolbar-spacer"></div>

      <v-btn class="crop-button" color="blue" :loading="waitingForFrame" @click="requestFrame">
        New Frame
        <v-icon right dark>mdi-camera</v-icon>
      </v-btn>

      <v-btn class="crop-button" color="green" :disabled="!frameSrc" @click="autoCrop">
        Auto Crop
        <v-icon right dark>mdi-crop-free</v-icon>
      </v-btn>

      <v-btn class="crop-button" :color="snapping ? 'teal' : 'grey darken-2'" @click="snapping = !snapping">
        Snap
        <v-icon right dark>{{ snapping ? 'mdi-magnet-on' : 'mdi-magnet' }}</v-icon>
      </v-btn>

      <v-btn class="crop-button" color="red" @click="resetCrop">
        Reset
        <v-icon right dark>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <div class="crop-wrapper">
      <div>
        <div class="crop-editor" :style="{ width: previewW + 'px', height: previewH + 'px' }">
          <img v-if="frameSrc" class="frame" :src="frameSrc" :width="previewW" :height="previewH" />

          <div v-if="snapping" class="snap-lines">
            <div
              v-for="line in snapLines.vertical"
              :key="'v' + line.pos"
              class="snap-line vertical"
              :class="{ active: activeLines.vertical.includes(line.pos) }"
              :style="{ left: line.pos / previewScale + 'px', opacity: 0.25 + line.score * 0.5 }"
            ></div>
            <div
              v-for="line in snapLines.horizontal"
              :key="'h' + line.pos"
              class="snap-line horizontal"
              :class="{ active: activeLines.horizontal.includes(line.pos) }"
              :style="{ top: line.pos / previewScale + 'px', opacity: 0.25 + line.score * 0.5 }"
            ></div>

            <div
              v-for="guide in activeGuides"
              :key="guide.kind + guide.axis + guide.pos"
              class="snap-guide"
              :class="[guide.axis === 'x' ? 'vertical' : 'horizontal', guide.kind]"
              :style="guide.axis === 'x'
                ? { left: guide.pos / previewScale + 'px' }
                : { top: guide.pos / previewScale + 'px' }"
            ></div>
          </div>

          <div
            v-if="dragging"
            class="snap-ghost"
            :style="{
              left: crop[0] / previewScale + 'px',
              top: crop[2] / previewScale + 'px',
              width: (CROP_W - crop[0] - crop[1]) / previewScale + 'px',
              height: (CROP_H - crop[2] - crop[3]) / previewScale + 'px',
            }"
          ></div>

          <div v-if="!frameSrc" class="frame-missing">
            {{ frameError || 'Waiting for a frame from OBS...' }}
          </div>

          <div
            class="nudge-holder"
            style="position: absolute"
            :style="{
              left: crop[0] / previewScale + 'px',
              top: crop[2] / previewScale + 'px',
              width: (CROP_W - crop[0] - crop[1]) / previewScale + 'px',
              height: (CROP_H - crop[2] - crop[3]) / previewScale + 'px',
            }"
          >
            <div class="move-arrows" style="left: -48px; top: 50%">
              <v-btn @mousedown="nudgeCrop(0, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-left</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(0, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div class="move-arrows" style="right: -60px; top: 50%">
              <v-btn @mousedown="nudgeCrop(1, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-left</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(1, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div class="move-arrows" style="left: 50%; top: -40px">
              <div>
                <v-btn @mousedown="nudgeCrop(2, -1)" x-small outlined dark>
                  <v-icon color="primary">mdi-arrow-up</v-icon>
                </v-btn>
              </div>
              <div>
                <v-btn @mousedown="nudgeCrop(2, 1)" x-small outlined dark>
                  <v-icon color="primary">mdi-arrow-down</v-icon>
                </v-btn>
              </div>
            </div>

            <div class="move-arrows" style="left: 50%; bottom: -49px">
              <div>
                <v-btn @mousedown="nudgeCrop(3, 1)" x-small outlined dark>
                  <v-icon color="primary">mdi-arrow-up</v-icon>
                </v-btn>
              </div>
              <div>
                <v-btn @mousedown="nudgeCrop(3, -1)" x-small outlined dark>
                  <v-icon color="primary">mdi-arrow-down</v-icon>
                </v-btn>
              </div>
            </div>
          </div>

          <!-- only moved via setPosition, it fakes a drag when its props change which messes up the crop -->
          <vue-drag-resize
            :parentW="previewW"
            :parentH="previewH"
            :isActive="true"
            :preventActiveBehavior="true"
            :isDraggable="true"
            :parentLimitation="true"
            :x="0"
            :y="0"
            :w="0"
            :h="0"
            ref="cropper"
            @resizing="cropChanged"
            @dragging="cropChanged"
            @resizestop="cropSettled"
            @dragstop="cropSettled"
          >
          </vue-drag-resize>
        </div>
      </div>

    </div>
  </div>
</template>

<style lang="scss">
.crop-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 auto;
  padding: 16px 0 0;
  box-sizing: border-box;
}

.crop-toolbar-spacer {
  flex: 1 1 auto;
}

.crop-input.v-input {
  flex: 0 0 116px;
}

.crop-button.v-btn {
  min-width: 132px;
}

.crop-wrapper {
  // centered with room for the nudge arrows (they'd get cut off by overflow:hidden)
  width: 100%;
  // room for the arrows sticking out (up to 49px)
  padding: 56px 64px 64px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  justify-content: center;
}

.crop-editor {
  position: relative;
  flex: 0 0 auto;

  .frame {
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }
}

.snap-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.snap-line {
  position: absolute;
  background: #4dd0e1;

  &.vertical {
    top: 0;
    width: 1px;
    height: 100%;
  }

  &.horizontal {
    left: 0;
    height: 1px;
    width: 100%;
  }

  &.active {
    background: #ffeb3b;
    opacity: 1 !important;
    box-shadow: 0 0 6px rgba(255, 235, 59, 0.8);
  }
}

// guides only show while snapping to them
.snap-guide {
  position: absolute;
  opacity: 0.9;

  &.vertical {
    top: 0;
    width: 1px;
    height: 100%;
    border-left: 1px dashed #ffeb3b;
  }

  &.horizontal {
    left: 0;
    height: 1px;
    width: 100%;
    border-top: 1px dashed #ffeb3b;
  }

  &.mirror {
    &.vertical {
      border-left-color: #ff80ab;
    }

    &.horizontal {
      border-top-color: #ff80ab;
    }
  }
}

// where the crop ends up when you let go
.snap-ghost {
  position: absolute;
  pointer-events: none;
  border: 2px solid rgba(255, 235, 59, 0.9);
  background: rgba(255, 235, 59, 0.08);
  box-sizing: border-box;
}

.frame-missing {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.6);
  box-sizing: border-box;
  text-align: center;
  padding: 0 40px;
}

.move-arrows {
  position: absolute;
  margin-top: -12px;
  margin-left: -12px;

  button,
  button .v-btn__content {
    min-width: auto !important;
    padding: 0 !important;
  }
}
</style>

<script>
import { bindReplicant } from '../../util.js';
import { detectEdgeLines, imageDataFromImage, suggestCrop } from '../../autocrop.js';

// crop values are 1920x1080, the editor shows half that
const CROP_W = 1920;
const CROP_H = 1080;
const NUDGE = 2; // pixels per arrow click
const FRAME_TIMEOUT = 5000;
const STALE_FRAME = 30000;
const SNAP_DISTANCE = 10; // editor pixels
const ASPECT_SNAP = 0.02;
const ASPECTS = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '10:9', value: 10 / 9 },
  { label: '1:1', value: 1 },
  { label: '4:6', value: 4 / 6 },
];
const ARROW_GUTTER = 128; // room for the arrows
const MAX_PREVIEW_W = 1280;

export default {
  created() {
    // dragging sends a lot, 50ms is enough for obs
    bindReplicant.call(this, 'crop', `player${this.player}crop`, 50);
    bindReplicant.call(this, 'url', `player${this.player}twitch`);
    bindReplicant.call(this, 'aspectratio', `player${this.player}aspectratio`);

    nodecg.listenFor('playerFrame', this.frameReceived);
  },

  mounted() {
    this.fitToPanel();
    this.resizeObserver = new ResizeObserver(() => this.fitToPanel());
    this.resizeObserver.observe(this.$el);

    // grab a frame when the tab is opened
    this.visibilityObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.becameVisible();
    });
    this.visibilityObserver.observe(this.$el);
  },

  beforeDestroy() {
    nodecg.unlisten('playerFrame', this.frameReceived);
    clearTimeout(this.frameTimer);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.visibilityObserver) this.visibilityObserver.disconnect();
  },

  props: ['player'],

  watch: {
    crop() {
      this.syncCropper();
    },
  },

  computed: {
    activeLines() {
      const hits = this.snapHits.filter((hit) => hit.kind === 'line');

      return {
        vertical: hits.filter((hit) => hit.axis === 'x').map((hit) => hit.pos),
        horizontal: hits.filter((hit) => hit.axis === 'y').map((hit) => hit.pos),
      };
    },

    activeGuides() {
      return this.snapHits.filter((hit) => ['center', 'mirror', 'edge'].includes(hit.kind));
    },
  },

  methods: {
    // editor is as wide as the panel, crop values scale with it
    fitToPanel() {
      const available = this.$el.clientWidth - ARROW_GUTTER;
      if (available <= 0) return;

      const width = Math.min(MAX_PREVIEW_W, Math.max(480, Math.round(available)));
      if (width === this.previewW) return;

      this.previewW = width;
      this.previewH = Math.round((width * CROP_H) / CROP_W);
      this.previewScale = CROP_W / width;

      this.$nextTick(() => this.syncCropper());
    },

    syncCropper() {
      if (!this.$refs.cropper || this.dragging) return;

      this.$refs.cropper.setPosition(
        this.crop[0] / this.previewScale,
        this.crop[1] / this.previewScale,
        this.crop[2] / this.previewScale,
        this.crop[3] / this.previewScale
      );
    },

    becameVisible() {
      this.$nextTick(() => this.fitToPanel());

      // old frame is probably a different game by now
      if (!this.frameSrc || Date.now() - this.lastFrameAt > STALE_FRAME) this.requestFrame();
    },

    // only obs has the player's pixels
    requestFrame() {
      this.waitingForFrame = true;
      this.frameError = '';

      nodecg.sendMessage('requestPlayerFrame', { player: Number(this.player) });

      clearTimeout(this.frameTimer);
      this.frameTimer = setTimeout(() => {
        if (!this.waitingForFrame) return;
        this.waitingForFrame = false;
        this.frameError = 'No answer from OBS. Is the layout open there, with obs-websocket connected?';
      }, FRAME_TIMEOUT);
    },

    frameReceived(frame) {
      if (Number(frame.player) !== Number(this.player)) return;

      this.waitingForFrame = false;
      clearTimeout(this.frameTimer);

      if (frame.error) {
        this.frameError = frame.error;
        return;
      }

      this.frameSrc = frame.imageData;
      this.lastFrameAt = Date.now();

      const image = new Image();
      image.onload = () => {
        this.frameImage = image;
        this.findSnapLines();
      };
      image.src = frame.imageData;
    },

    // suggested lines: overlays, webcam frames, bezels
    findSnapLines() {
      const data = imageDataFromImage(this.frameImage);
      const lines = detectEdgeLines(data);
      const toCropX = CROP_W / data.width;
      const toCropY = CROP_H / data.height;

      const vertical = lines.vertical.map((l) => ({ pos: Math.round(l.pos * toCropX), score: l.score }));
      const horizontal = lines.horizontal.map((l) => ({ pos: Math.round(l.pos * toCropY), score: l.score }));

      // the game area replaces any line it overlaps, it's usually the one you want
      const box = suggestCrop(data);

      if (box[0] || box[1] || box[2] || box[3]) {
        this.addContentLine(vertical, Math.round(box[0] * toCropX), CROP_W);
        this.addContentLine(vertical, CROP_W - Math.round(box[1] * toCropX), CROP_W);
        this.addContentLine(horizontal, Math.round(box[2] * toCropY), CROP_H);
        this.addContentLine(horizontal, CROP_H - Math.round(box[3] * toCropY), CROP_H);
      }

      this.snapLines = { vertical, horizontal };
    },

    addContentLine(lines, pos, size) {
      const tooClose = Math.round(size * 0.02);

      for (let i = lines.length - 1; i >= 0; i--) {
        if (Math.abs(lines[i].pos - pos) <= tooClose) lines.splice(i, 1);
      }

      lines.push({ pos, score: 1 });
      lines.sort((a, b) => a.pos - b.pos);
    },

    // stuff to snap to: detected lines, frame edges, center, mirrored inset
    candidatesFor(axis, edge, opposite) {
      const size = axis === 'x' ? CROP_W : CROP_H;
      const lines = axis === 'x' ? this.snapLines.vertical : this.snapLines.horizontal;

      const out = lines.map((line) => ({
        inset: edge === 'start' ? line.pos : size - line.pos,
        pos: line.pos,
        kind: 'line',
        axis,
      }));

      out.push({ inset: 0, pos: edge === 'start' ? 0 : size, kind: 'edge', axis });
      out.push({ inset: size / 2, pos: size / 2, kind: 'center', axis });

      // mirroring only makes sense while the other edge stays put
      if (opposite !== null) {
        out.push({ inset: opposite, pos: edge === 'start' ? opposite : size - opposite, kind: 'mirror', axis });
      }

      return out;
    },

    snapTo(value, candidates, hits) {
      if (!this.snapping) return value;

      const tolerance = SNAP_DISTANCE * this.previewScale;
      let best = null;
      let bestDistance = tolerance;

      for (const candidate of candidates) {
        const distance = Math.abs(candidate.inset - value);
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }

      if (!best) return value;

      hits.push(best);
      return Math.round(best.inset);
    },

    // snap corner drags to common aspect ratios
    snapAspect(crop, changed, hits) {
      if (!this.snapping) return crop;
      if (!(changed.x && changed.y)) return crop;

      const width = CROP_W - crop[0] - crop[1];
      const height = CROP_H - crop[2] - crop[3];
      if (width <= 0 || height <= 0) return crop;

      const aspect = width / height;
      const match = ASPECTS.find((a) => Math.abs(aspect - a.value) / a.value < ASPECT_SNAP);
      if (!match) return crop;

      const target = Math.round(width / match.value);
      const diff = height - target;
      if (!diff) return crop;

      const next = crop.slice();
      if (changed.y === 'top') {
        next[2] = Math.max(0, next[2] + diff);
      } else {
        next[3] = Math.max(0, next[3] + diff);
      }

      hits.push({ kind: 'aspect', label: match.label });
      return next;
    },

    autoCrop() {
      if (!this.frameImage) return;

      const box = suggestCrop(imageDataFromImage(this.frameImage));
      const toCropX = CROP_W / this.frameImage.naturalWidth;
      const toCropY = CROP_H / this.frameImage.naturalHeight;

      this.$set(this.crop, 0, Math.round(box[0] * toCropX));
      this.$set(this.crop, 1, Math.round(box[1] * toCropX));
      this.$set(this.crop, 2, Math.round(box[2] * toCropY));
      this.$set(this.crop, 3, Math.round(box[3] * toCropY));
    },

    resetCrop() {
      this.crop = [0, 0, 0, 0];
    },

    cropChanged(coordinates) {
      const raw = [
        Math.round(coordinates.left * this.previewScale),
        Math.round(coordinates.right * this.previewScale),
        Math.round(coordinates.top * this.previewScale),
        Math.round(coordinates.bottom * this.previewScale),
      ];

      // which edges actually moved
      const previous = this.crop.slice();
      const changed = {
        x: raw[0] !== previous[0] ? 'left' : raw[1] !== previous[1] ? 'right' : null,
        y: raw[2] !== previous[2] ? 'top' : raw[3] !== previous[3] ? 'bottom' : null,
      };

      // only snap the edges that moved
      const moved = [0, 1, 2, 3].map((i) => raw[i] !== previous[i]);
      const mirrorOf = (i) => (moved[i] ? null : previous[i]);

      const hits = [];
      let next = [
        moved[0] ? this.snapTo(raw[0], this.candidatesFor('x', 'start', mirrorOf(1)), hits) : previous[0],
        moved[1] ? this.snapTo(raw[1], this.candidatesFor('x', 'end', mirrorOf(0)), hits) : previous[1],
        moved[2] ? this.snapTo(raw[2], this.candidatesFor('y', 'start', mirrorOf(3)), hits) : previous[2],
        moved[3] ? this.snapTo(raw[3], this.candidatesFor('y', 'end', mirrorOf(2)), hits) : previous[3],
      ];

      next = this.snapAspect(next, changed, hits);

      this.dragging = true;
      this.snapHits = hits;

      for (let i = 0; i < 4; i++) this.$set(this.crop, i, next[i]);
    },

    // box follows the snapped values when you let go
    cropSettled() {
      this.dragging = false;
      this.snapHits = [];
      this.syncCropper();
    },

    nudgeCrop(i, diff) {
      let val = this.crop[i] + diff * NUDGE;
      if (i < 2) {
        val = Math.max(0, Math.min(CROP_W, val));
      } else {
        val = Math.max(0, Math.min(CROP_H, val));
      }

      this.$set(this.crop, i, val);
    },
  },

  data() {
    return {
      CROP_W,
      CROP_H,
      previewScale: 2,
      previewW: 960,
      previewH: 540,
      resizeObserver: null,

      crop: [0, 0, 0, 0],
      url: '',
      aspectratio: false,

      frameSrc: '',
      frameImage: null,
      frameError: '',
      snapping: true,
      snapLines: { vertical: [], horizontal: [] },
      snapHits: [],
      dragging: false,
      waitingForFrame: false,
      frameTimer: null,
      lastFrameAt: 0,
      visibilityObserver: null,
    };
  },
};
</script>
