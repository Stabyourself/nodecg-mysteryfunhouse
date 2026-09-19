<template>
  <div>
    <canvas
      id="telestrator"
      :class="{ erasing: erasing }"
      @pointerdown="mouseDown"
      @mousedown.prevent
      @pointercancel="endStroke"
      @pointermove="mouseMove"
      @pointerenter="cursorVisible = true"
      @pointerleave="cursorVisible = false"
      v-show="!hidden"
    ></canvas>

    <div ref="cursor" class="size-cursor" :class="{ eraser: erasing }" v-show="cursorVisible && !hidden" :style="cursorStyle"></div>

    <div class="toolbar-zone" @click.stop @mousedown.stop>
      <div class="toolbar">
        <div class="group swatches">
          <button
            v-for="(c, i) in colors"
            :key="c"
            class="swatch"
            :class="{ active: !erasing && color == c }"
            :style="{ backgroundColor: c }"
            :title="i < 10 ? `${c} (${(i + 1) % 10})` : c"
            @click="selectColor(c)"
          ></button>
        </div>

        <div class="divider"></div>

        <div class="group">
          <button class="tool" :class="{ active: !erasing }" title="Pen (P)" @click="erasing = false">
            <i class="mdi mdi-draw"></i>
          </button>
          <button class="tool" :class="{ active: erasing }" title="Eraser (E)" @click="erasing = true">
            <i class="mdi mdi-eraser"></i>
          </button>
        </div>

        <div class="divider"></div>

        <div class="group size" title="Size (- / +)">
          <input v-model.number="thickness" type="range" min="1" :max="MAX_THICKNESS" step="1" />
          <div class="size-preview">
            <div
              class="size-dot"
              :class="{ eraser: erasing }"
              :style="{
                width: `${thickness}px`,
                height: `${thickness}px`,
                backgroundColor: erasing ? 'transparent' : color,
              }"
            ></div>
          </div>
          <span class="size-label">{{ thickness }}</span>
        </div>

        <div class="divider"></div>

        <div class="group">
          <button class="tool" title="Undo (Ctrl+Z)" :disabled="!undoStack.length" @click="undo">
            <i class="mdi mdi-undo"></i>
          </button>
          <button class="tool" title="Redo (Ctrl+Y)" :disabled="!redoStack.length" @click="redo">
            <i class="mdi mdi-redo"></i>
          </button>
        </div>

        <div class="divider"></div>

        <div class="group">
          <button class="tool labeled" title="Clear everyone's drawing (Shift+C)" @click="clearBtn">
            <i class="mdi mdi-delete-sweep"></i>
            <span>Clear</span>
          </button>
          <button class="tool labeled" :class="{ active: hidden }" title="Hide / show (H)" @click="toggleHide">
            <i class="mdi" :class="hidden ? 'mdi-eye-off' : 'mdi-eye'"></i>
            <span>{{ hidden ? 'Show' : 'Hide' }}</span>
          </button>
        </div>
      </div>
      <div class="handle"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$bg: rgba(18, 18, 24, 0.82);
$border: rgba(255, 255, 255, 0.12);
$accent: #ffd54a;

canvas {
  background-color: rgba(0, 0, 0, 0);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  touch-action: none;
  cursor: none;
}

.size-cursor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  pointer-events: none;
  border-radius: 50%;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.6);
  box-sizing: border-box;

  &.eraser {
    border-style: dashed;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 4px;
      height: 4px;
      margin: -2px 0 0 -2px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
    }
  }
}

.toolbar-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 1920px;
  height: 18px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: Roboto, sans-serif;

  &:hover {
    .toolbar {
      transform: translateY(0);
      opacity: 1;
      transition-delay: 0s;
    }

    .handle {
      opacity: 0;
    }
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px 14px;
  max-width: calc(1920px - 32px);
  box-sizing: border-box;
  padding: 10px 16px;
  background: $bg;
  backdrop-filter: blur(10px);
  border: 1px solid $border;
  border-top: none;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  color: #fff;
  user-select: none;

  transform: translateY(-110%);
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s, opacity 0.2s ease 0.4s;
}

.handle {
  position: absolute;
  top: 0;
  width: 64px;
  height: 5px;
  border-radius: 0 0 5px 5px;
  background: rgba(255, 255, 255, 0.35);
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.divider {
  width: 1px;
  align-self: stretch;
  background: $border;
}

button {
  border: none;
  outline: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  transition: transform 0.12s ease, box-shadow 0.12s ease;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    transform: scale(1.1);
    box-shadow: 0 0 0 2px $bg, 0 0 0 4px #fff;
  }
}

.tool {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  min-width: 36px;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  transition: background 0.12s ease, color 0.12s ease;

  i {
    font-size: 20px;
  }

  &.labeled {
    padding: 0 12px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }

  &.active {
    background: $accent;
    color: #1a1a1a;
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
    background: rgba(255, 255, 255, 0.06);
  }
}

.size {
  gap: 10px;

  input[type='range'] {
    width: 120px;
    accent-color: $accent;
    cursor: pointer;
  }
}

.size-preview {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.size-dot {
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4);

  &.eraser {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
    border: 1px dashed rgba(255, 255, 255, 0.8);
  }
}

.size-label {
  width: 20px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.7);
}
</style>

<script>
const WIDTH = 1920;
const HEIGHT = 1080;
const SHADOW_OFFSET = 5;
const FLUSH_INTERVAL = 30;
const MIN_POINT_DISTANCE = 1.5;
const ERASER_SCALE = 8;
const MAX_THICKNESS = 36;
const SIZE_STEP = 2;
const MIN_CURSOR_SIZE = 6;

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  return canvas;
}

function setupContext(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawStroke(ctx, stroke) {
  const pts = stroke.pts;
  if (pts.length === 0) return;

  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.erase ? '#000' : stroke.c;
  ctx.lineWidth = stroke.t;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);

  if (pts.length === 1) {
    ctx.lineTo(pts[0][0], pts[0][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i][0] + pts[i + 1][0]) / 2;
      const midY = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

export default {
  name: 'Telestrator',

  created() {
    this.activeStrokes = new Map();
    this.strokes = [];
    this.localStroke = null;
    this.pendingPts = [];
    this.flushTimer = null;
    this.frameRequested = false;
  },

  mounted() {
    this.canvas = document.getElementById('telestrator');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext('2d');

    this.committed = makeCanvas();
    this.committedCtx = this.committed.getContext('2d');
    setupContext(this.committedCtx);

    this.work = makeCanvas();
    this.workCtx = this.work.getContext('2d');
    setupContext(this.workCtx);

    nodecg.listenFor('telestratorStroke', this.strokeReceived);
    nodecg.listenFor('clearTelestrator', this.clear);
    nodecg.listenFor('telestratorUndo', this.undoReceived);

    window.addEventListener('pointerup', this.mouseUp);
    window.addEventListener('blur', this.endStroke);
    window.addEventListener('keydown', this.keyDown);
  },

  beforeDestroy() {
    window.removeEventListener('pointerup', this.mouseUp);
    window.removeEventListener('blur', this.endStroke);
    window.removeEventListener('keydown', this.keyDown);
    clearInterval(this.flushTimer);
  },

  computed: {
    cursorStyle() {
      const t = Math.min(this.thickness, MAX_THICKNESS);
      const size = Math.max(this.erasing ? t * ERASER_SCALE : t, MIN_CURSOR_SIZE);
      return {
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: this.erasing ? 'transparent' : `${this.color}55`,
      };
    },
  },

  methods: {
    keyDown(e) {
      const target = e.target;
      if (target.isContentEditable || target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type !== 'range')) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && key === 'z' && !e.shiftKey) {
        this.undo();
      } else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        this.redo();
      } else if (ctrl || e.altKey) {
        return;
      } else if (/^[0-9]$/.test(e.key)) {
        const c = this.colors[(Number(e.key) + 9) % 10];
        if (!c) return;
        this.selectColor(c);
      } else if (key === 'p' || key === 'b') {
        this.erasing = false;
      } else if (key === 'e') {
        this.erasing = true;
      } else if (e.key === '-' || e.key === '[') {
        this.thickness = Math.max(1, this.thickness - SIZE_STEP);
      } else if (e.key === '+' || e.key === '=' || e.key === ']') {
        this.thickness = Math.min(MAX_THICKNESS, this.thickness + SIZE_STEP);
      } else if (key === 'h') {
        this.toggleHide();
      } else if (key === 'c' && e.shiftKey) {
        this.clearBtn();
      } else {
        return;
      }

      e.preventDefault();
    },

    toggleHide() {
      this.hidden = !this.hidden;
    },

    selectColor(c) {
      this.color = c;
      this.erasing = false;
    },

    mouseDown(e) {
      if (e.button !== 0) return;
      this.endStroke();

      const thickness = Math.min(this.thickness, MAX_THICKNESS);
      this.localStroke = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        c: this.color,
        t: this.erasing ? thickness * ERASER_SCALE : thickness,
        erase: this.erasing,
        last: [e.pageX, e.pageY],
      };
      this.pendingPts = [[e.pageX, e.pageY]];
      this.flush();
      this.flushTimer = setInterval(this.flush, FLUSH_INTERVAL);

      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    },

    mouseMove(e) {
      this.cursorVisible = true;
      this.$refs.cursor.style.transform = `translate(${e.pageX}px, ${e.pageY}px) translate(-50%, -50%)`;

      if (!this.localStroke) return;

      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of events.length ? events : [e]) {
        this.addPoint(ev.pageX, ev.pageY);
      }
    },

    mouseUp(e) {
      if (!this.localStroke) return;
      this.addPoint(e.pageX, e.pageY);
      this.endStroke();
    },

    endStroke() {
      if (!this.localStroke) return;
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      this.flush(true);
      this.undoStack.push(this.localStroke.id);
      this.redoStack = [];
      this.localStroke = null;
    },

    undo() {
      this.endStroke();
      const id = this.undoStack.pop();
      if (!id) return;
      this.redoStack.push(id);
      nodecg.sendMessage('telestratorUndo', { id, undone: true });
    },

    redo() {
      this.endStroke();
      const id = this.redoStack.pop();
      if (!id) return;
      this.undoStack.push(id);
      nodecg.sendMessage('telestratorUndo', { id, undone: false });
    },

    undoReceived(msg) {
      const stroke = this.strokes.find((s) => s.id === msg.id);
      if (!stroke || stroke.undone === msg.undone) return;
      stroke.undone = msg.undone;
      this.redrawCommitted();
    },

    redrawCommitted() {
      this.committedCtx.clearRect(0, 0, WIDTH, HEIGHT);
      for (const stroke of this.strokes) {
        if (!stroke.undone) drawStroke(this.committedCtx, stroke);
      }
      this.requestRender();
    },

    addPoint(x, y) {
      const last = this.localStroke.last;
      if (Math.hypot(x - last[0], y - last[1]) < MIN_POINT_DISTANCE) return;
      this.localStroke.last = [x, y];
      this.pendingPts.push([x, y]);
    },

    flush(done = false) {
      if (!this.localStroke || (!done && this.pendingPts.length === 0)) return;

      const s = this.localStroke;
      nodecg.sendMessage('telestratorStroke', {
        id: s.id,
        c: s.c,
        t: s.t,
        erase: s.erase,
        pts: this.pendingPts,
        done,
      });
      this.pendingPts = [];
    },

    strokeReceived(msg) {
      let stroke = this.activeStrokes.get(msg.id);
      if (!stroke) {
        stroke = { id: msg.id, c: msg.c, t: msg.t, erase: msg.erase, pts: [], undone: false };
        this.activeStrokes.set(msg.id, stroke);
      }
      for (const p of msg.pts) stroke.pts.push(p);

      if (msg.done) {
        drawStroke(this.committedCtx, stroke);
        this.strokes.push(stroke);
        this.activeStrokes.delete(msg.id);
      }

      this.requestRender();
    },

    clearBtn() {
      nodecg.sendMessage('clearTelestrator');
    },

    clear() {
      this.activeStrokes.clear();
      this.strokes = [];
      this.undoStack = [];
      this.redoStack = [];
      this.committedCtx.clearRect(0, 0, WIDTH, HEIGHT);
      this.requestRender();
    },

    requestRender() {
      if (this.frameRequested) return;
      this.frameRequested = true;
      requestAnimationFrame(this.render);
    },

    render() {
      this.frameRequested = false;

      let source = this.committed;
      if (this.activeStrokes.size > 0) {
        this.workCtx.clearRect(0, 0, WIDTH, HEIGHT);
        this.workCtx.drawImage(this.committed, 0, 0);
        for (const stroke of this.activeStrokes.values()) {
          drawStroke(this.workCtx, stroke);
        }
        source = this.work;
      }

      this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
      this.ctx.shadowColor = '#000';
      this.ctx.shadowOffsetX = SHADOW_OFFSET;
      this.ctx.shadowOffsetY = 0;
      this.ctx.shadowBlur = 0;
      this.ctx.drawImage(source, 0, 0);
    },
  },

  data() {
    return {
      colors: [
        '#ffff00',
        '#ff0000',
        '#0000ff',
        '#00ff00',
        '#00ffff',
        '#ff00ff',
        '#ffffff',
        '#000000',
        '#ffa500',
        '#800080',
        '#ffc0cb',
        '#a52a2a',
        '#808080',
      ],
      color: '#ffff00',
      thickness: 5,
      MAX_THICKNESS,
      erasing: false,
      hidden: false,
      cursorVisible: false,
      undoStack: [],
      redoStack: [],
    };
  },
};
</script>
