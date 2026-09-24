<template>
  <transition-group name="candy" tag="div" class="replay-overlay">
    <div v-for="box in boxes" :key="box.key" class="candy-box" :class="box.kind">
      <div
        v-for="(piece, i) in box.pieces"
        :key="i"
        class="candy-stripes"
        :style="{ left: piece.x + 'px', top: piece.y + 'px', width: piece.width + 'px', height: piece.height + 'px' }"
      ></div>

      <div class="candy-label" :style="{ left: box.label.x + 'px', top: box.label.y + 'px' }">
        {{ box.kind === 'live' ? 'LIVE' : 'REPLAY' }}
      </div>
    </div>
  </transition-group>
</template>

<style lang="scss" scoped>
// stripe period is 20px so a 20*sqrt(2) tile repeats cleanly
$stripe-tile: 28.2843px;

.replay-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 1920px;
  height: 1080px;
  pointer-events: none;
}

.candy-box {
  position: absolute;
  top: 0;
  left: 0;

  &.live {
    --candy: #e53935;
    --candy-text: #ffffff;
  }

  &.replay {
    --candy: #fdd835;
    --candy-text: #212121;
  }
}

// one rect per edge instead of a mask (obs had hairline leaks with clip-path)
// fixed background so the stripes line up across the pieces
.candy-stripes {
  position: absolute;
  background: repeating-linear-gradient(45deg, var(--candy) 0 10px, transparent 10px 20px);
  background-size: $stripe-tile $stripe-tile;
  background-attachment: fixed;
  animation: candy-slide 0.8s linear infinite;
}

.candy-label {
  position: absolute;
  padding: 4px 14px;
  background: var(--candy);
  color: var(--candy-text);
  font-family: Roboto, sans-serif;
  font-weight: 900;
  font-size: 24px;
  letter-spacing: 2px;
  line-height: 1.2;
}

.live .candy-label {
  font-size: 16px;
  padding: 2px 10px;
}

// has to match BORDER_FADE in ObsVideo.vue
.candy-enter-active,
.candy-leave-active {
  transition: opacity 0.3s;
}

.candy-enter,
.candy-leave-to {
  opacity: 0;
}

@keyframes candy-slide {
  to {
    background-position: $stripe-tile 0;
  }
}
</style>

<script>
// LIVE/REPLAY borders during replays, positions come from ObsVideo

// whole pixels so the pieces meet cleanly
function snap({ x, y, width, height }) {
  const left = Math.round(x);
  const top = Math.round(y);
  return { x: left, y: top, width: Math.round(x + width) - left, height: Math.round(y + height) - top };
}

// parts of a not covered by b
function subtract(a, b) {
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);

  if (left >= right || top >= bottom) return [a];

  return [
    { x: a.x, y: a.y, width: a.width, height: top - a.y },
    { x: a.x, y: bottom, width: a.width, height: a.y + a.height - bottom },
    { x: a.x, y: top, width: left - a.x, height: bottom - top },
    { x: right, y: top, width: a.x + a.width - right, height: bottom - top },
  ].filter((piece) => piece.width > 0 && piece.height > 0);
}

export default {
  name: 'ReplayOverlay',

  created() {
    nodecg.listenFor('videoRects', this.onRects);
    nodecg.sendMessage('requestVideoRects');
  },

  beforeDestroy() {
    nodecg.unlisten('videoRects', this.onRects);
  },

  methods: {
    onRects({ player, live, replay }) {
      this.$set(this.players, player, { live, replay });
    },

    // rect + border
    outer(rect) {
      return snap({
        x: rect.x - this.border,
        y: rect.y - this.border,
        width: rect.width + this.border * 2,
        height: rect.height + this.border * 2,
      });
    },

    // the stripes are see-through, so cut the live box out of the replay border
    box(key, kind, rect, cover) {
      const o = this.outer(rect);
      const b = this.border;

      let pieces = [
        { x: o.x, y: o.y, width: o.width, height: b },
        { x: o.x, y: o.y + o.height - b, width: o.width, height: b },
        { x: o.x, y: o.y + b, width: b, height: o.height - b * 2 },
        { x: o.x + o.width - b, y: o.y + b, width: b, height: o.height - b * 2 },
      ];

      if (cover) {
        const hole = this.outer(cover);
        pieces = pieces.flatMap((piece) => subtract(piece, hole));
      }

      return { key, kind, pieces, label: { x: o.x, y: o.y } };
    },
  },

  computed: {
    // live boxes on top
    boxes() {
      const replays = [];
      const lives = [];

      for (const [player, { live, replay }] of Object.entries(this.players)) {
        if (!replay) continue;

        replays.push(this.box(`replay${player}`, 'replay', replay, live));
        if (live) lives.push(this.box(`live${player}`, 'live', live));
      }

      return replays.concat(lives);
    },
  },

  data() {
    return {
      border: 6,
      players: {},
    };
  },
};
</script>
