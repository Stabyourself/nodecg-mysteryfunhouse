<template>
  <div>
    <div class="crop-header">
      <div class="crop-toolbar" :style="{ width: previewW + 'px' }">
        <div class="crop-title">
          <span class="crop-title-number">{{ player + 1 }}</span>
          <span class="crop-title-name">{{ name || `Player ${player + 1}` }}</span>
        </div>

        <div class="crop-inputs">
          <label v-for="input in inputs" :key="input.index" class="crop-input" :title="input.label + ' crop'">
            <v-icon small>{{ input.icon }}</v-icon>
            <input v-model.number="crop[input.index]" type="number" min="0" :max="input.max" />
          </label>
        </div>

        <div class="crop-toolbar-spacer"></div>

        <div class="crop-actions">
          <v-btn class="crop-button" color="primary" depressed :loading="waitingForFrame" @click="requestFrame">
            <v-icon left>mdi-camera</v-icon>
            New frame
          </v-btn>

          <v-btn class="crop-button" outlined :disabled="!frameSrc" @click="autoCrop">
            <v-icon left>mdi-crop-free</v-icon>
            Auto crop
          </v-btn>

          <v-btn
            class="crop-button"
            outlined
            :color="snapping ? 'primary' : ''"
            :title="snapping ? 'Snapping on' : 'Snapping off'"
            @click="snapping = !snapping"
          >
            <v-icon left>{{ snapping ? 'mdi-magnet-on' : 'mdi-magnet' }}</v-icon>
            Snap
          </v-btn>

          <v-btn class="crop-button" text color="red lighten-1" @click="resetCrop">
            <v-icon left>mdi-refresh</v-icon>
            Reset
          </v-btn>
        </div>
      </div>
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
              left: arrowBox[0] / previewScale + 'px',
              top: arrowBox[2] / previewScale + 'px',
              width: (CROP_W - arrowBox[0] - arrowBox[1]) / previewScale + 'px',
              height: (CROP_H - arrowBox[2] - arrowBox[3]) / previewScale + 'px',
            }"
          >
            <!-- stacked across the edge they move. they go inside the box when the edge is too close to the frame.
                 they follow the red box you're dragging, not the snapped one -->
            <div class="move-arrows left" :class="{ inside: arrowsInside.left }">
              <v-btn @mousedown="nudgeCrop(0, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-left</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(0, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div class="move-arrows right" :class="{ inside: arrowsInside.right }">
              <v-btn @mousedown="nudgeCrop(1, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-left</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(1, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <div class="move-arrows top" :class="{ inside: arrowsInside.top }">
              <v-btn @mousedown="nudgeCrop(2, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-up</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(2, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-down</v-icon>
              </v-btn>
            </div>

            <div class="move-arrows bottom" :class="{ inside: arrowsInside.bottom }">
              <v-btn @mousedown="nudgeCrop(3, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-up</v-icon>
              </v-btn>
              <v-btn @mousedown="nudgeCrop(3, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-down</v-icon>
              </v-btn>
            </div>
          </div>

          <!-- only moved via setPosition, it fakes a drag when its props change which messes up the crop -->
          <vue-drag-resize
            :parentW="previewW"
            :parentH="previewH"
            :isActive="true"
            :preventActiveBehavior="true"
            :isDraggable="false"
            :parentLimitation="true"
            :x="0"
            :y="0"
            :w="0"
            :h="0"
            ref="cropper"
            @resizing="cropChanged"
            @resizestop="cropSettled"
          >
          </vue-drag-resize>
        </div>
      </div>

    </div>
  </div>
</template>

<style lang="scss">
.crop-header {
  padding: 8px 0 0;
}

// slim bar, everything 30px tall
.crop-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0 auto;
  padding: 4px;
  box-sizing: border-box;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.crop-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 220px;
  padding-left: 2px;
  font-size: 14px;
  font-weight: 500;
}

.crop-title-number {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  line-height: 22px;
  border-radius: 50%;
  text-align: center;
  font-size: 12px;
  background: #00bebe;
  color: #000;
}

.crop-title-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crop-inputs,
.crop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.crop-toolbar-spacer {
  flex: 1 1 auto;
}

// arrow + number, the arrow says which edge
.crop-input {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 0 6px 0 4px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  cursor: text;

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:focus-within {
    border-color: #00bebe;
  }

  .v-icon {
    color: rgba(255, 255, 255, 0.6) !important;
  }

  input {
    width: 42px;
    border: none;
    outline: none;
    background: transparent;
    color: #fff;
    font-size: 14px;
    font-variant-numeric: tabular-nums;

    // the spinners eat half the width
    -moz-appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
}

.crop-button.v-btn {
  height: 30px !important;
  padding: 0 10px !important;
  text-transform: none;
  letter-spacing: normal;

  .v-icon--left {
    margin-right: 4px;
  }
}

.crop-wrapper {
  // centered, the nudge arrows move inside the crop box when there's no room outside
  width: 100%;
  // keep in sync with PAD_X, PAD_TOP, PAD_BOTTOM
  padding: 6px 12px 12px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  justify-content: center;
}

.crop-editor {
  position: relative;
  flex: 0 0 auto;

  // only the resize handles take the mouse, the box itself would cover the nudge arrows
  .vdr {
    pointer-events: none;
  }

  .vdr-stick {
    pointer-events: auto;
  }

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

// lines are centered on the crop edge they stand for, not next to it
.snap-line {
  position: absolute;
  background: #4dd0e1;

  &.vertical {
    top: 0;
    width: 1px;
    height: 100%;
    margin-left: -0.5px;
  }

  &.horizontal {
    left: 0;
    height: 1px;
    width: 100%;
    margin-top: -0.5px;
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
    width: 0;
    height: 100%;
    margin-left: -0.5px;
    border-left: 1px dashed #ffeb3b;
  }

  &.horizontal {
    left: 0;
    height: 0;
    width: 100%;
    margin-top: -0.5px;
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

// where the crop ends up when you let go. outline goes outside the box like the crop box's,
// so the inside is exactly what stays visible
.snap-ghost {
  position: absolute;
  pointer-events: none;
  outline: 2px solid rgba(255, 235, 59, 0.9);
  background: rgba(255, 235, 59, 0.08);
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

// 22px thick, sitting just outside the crop box's outline
.move-arrows {
  position: absolute;
  display: flex;
  gap: 2px;

  &.left,
  &.right {
    flex-direction: column;
    top: 50%;
    transform: translateY(-50%);
  }

  &.left {
    right: calc(100% + 4px);
  }

  &.right {
    left: calc(100% + 4px);
  }

  &.top,
  &.bottom {
    left: 50%;
    transform: translateX(-50%);
  }

  &.top {
    bottom: calc(100% + 4px);
  }

  &.bottom {
    top: calc(100% + 4px);
  }

  // no room outside: just inside the edge, past the resize handles
  &.left.inside {
    right: auto;
    left: 8px;
  }

  &.right.inside {
    left: auto;
    right: 8px;
  }

  &.top.inside {
    bottom: auto;
    top: 8px;
  }

  &.bottom.inside {
    top: auto;
    bottom: 8px;
  }

  button.v-btn,
  button .v-btn__content {
    min-width: 22px !important;
    width: 22px;
    height: 22px !important;
    padding: 0 !important;
  }

  .v-icon {
    font-size: 18px !important;
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
// .crop-wrapper padding around the editor
const PAD_X = 12;
const PAD_TOP = 6;
const PAD_BOTTOM = 12;
const ARROW_ROOM = 26; // nudge arrows are 22px + 4px gap to the edge

export default {
  created() {
    // dragging sends a lot, 50ms is enough for obs
    bindReplicant.call(this, 'crop', `player${this.player}crop`, 50);
    bindReplicant.call(this, 'url', `player${this.player}twitch`);
    bindReplicant.call(this, 'aspectratio', `player${this.player}aspectratio`);
    bindReplicant.call(this, 'name', `player${this.player}name`);

    nodecg.listenFor('playerFrame', this.frameReceived);
  },

  mounted() {
    this.fitToPanel();
    this.resizeObserver = new ResizeObserver(() => this.fitToPanel());
    this.resizeObserver.observe(this.$el);
    window.addEventListener('resize', this.fitToPanel);

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
    window.removeEventListener('resize', this.fitToPanel);
    if (this.visibilityObserver) this.visibilityObserver.disconnect();
  },

  props: ['player'],

  watch: {
    crop() {
      this.syncCropper();
    },
  },

  computed: {
    // which nudge arrows don't fit between their crop edge and the end of the page
    arrowsInside() {
      const room = (crop, pad) => crop / this.previewScale + pad;

      return {
        left: room(this.arrowBox[0], PAD_X) < ARROW_ROOM,
        right: room(this.arrowBox[1], PAD_X) < ARROW_ROOM,
        top: room(this.arrowBox[2], PAD_TOP) < ARROW_ROOM,
        bottom: room(this.arrowBox[3], PAD_BOTTOM) < ARROW_ROOM,
      };
    },

    // while dragging that's the unsnapped red box, otherwise it's the same as the crop
    arrowBox() {
      return this.dragging && this.dragBox ? this.dragBox : this.crop;
    },

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
    // editor takes the whole column, crop values scale with it. the page scrolls if it gets tall.
    // never bigger than the crop space itself (1:1 pixels)
    fitToPanel() {
      const available = this.$el.clientWidth - PAD_X * 2;
      if (available <= 0) return;

      const width = Math.min(CROP_W, Math.max(480, Math.round(available)));
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
      this.lastFrameError = '';

      nodecg.sendMessage('requestPlayerFrame', { player: Number(this.player) });

      clearTimeout(this.frameTimer);
      this.frameTimer = setTimeout(() => {
        if (!this.waitingForFrame) return;
        this.waitingForFrame = false;
        this.frameError =
          this.lastFrameError || 'No answer from OBS. Is player.html loaded there, with obs-websocket connected?';
      }, FRAME_TIMEOUT);
    },

    frameReceived(frame) {
      if (Number(frame.player) !== Number(this.player)) return;

      // the player page and every layout answer, one failing doesn't mean the others will
      if (frame.error) {
        this.lastFrameError = frame.error;
        return;
      }

      this.waitingForFrame = false;
      clearTimeout(this.frameTimer);

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
      this.dragBox = raw;
      this.snapHits = hits;

      for (let i = 0; i < 4; i++) this.$set(this.crop, i, next[i]);
    },

    // box follows the snapped values when you let go
    cropSettled() {
      this.dragging = false;
      this.dragBox = null;
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
      name: '',
      inputs: [
        { index: 0, label: 'Left', icon: 'mdi-arrow-left', max: CROP_W },
        { index: 1, label: 'Right', icon: 'mdi-arrow-right', max: CROP_W },
        { index: 2, label: 'Top', icon: 'mdi-arrow-up', max: CROP_H },
        { index: 3, label: 'Bottom', icon: 'mdi-arrow-down', max: CROP_H },
      ],

      frameSrc: '',
      frameImage: null,
      frameError: '',
      lastFrameError: '',
      snapping: true,
      snapLines: { vertical: [], horizontal: [] },
      snapHits: [],
      dragging: false,
      dragBox: null,
      waitingForFrame: false,
      frameTimer: null,
      lastFrameAt: 0,
      visibilityObserver: null,
    };
  },
};
</script>
