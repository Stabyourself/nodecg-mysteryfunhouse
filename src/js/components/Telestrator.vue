<template>
  <div>
    <canvas id="telestrator" @mousedown="mouseDown" @mouseup="mouseUp" @mousemove="mouseMove"></canvas>

    <div class="telestrator-controls" @click.stop>
      <v-btn v-for="c in colors" :key="c" :color="c" @click="color = c">
        <v-icon v-if="color == c">mdi-check</v-icon>
      </v-btn>
      <div style="width: 100px">
        <v-slider v-model="thickness" min="1" max="50" step="1" thumb-label :thumb-size="thickness"></v-slider>
      </div>
      <v-btn style="margin-left: 2em" @click="clearBtn">Clear</v-btn>
    </div>
  </div>
</template>

<style lang="scss" scoped>
canvas {
  background-color: rgba(0, 0, 0, 0);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}

.telestrator-controls {
  &:not(:hover) {
    opacity: 0;
  }

  position: absolute;
  top: 0;
  left: 0;
  z-index: 1001;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;

  button i {
    text-shadow: 0 0 3px black;
  }
}
</style>

<script>
export default {
  name: 'Telestrator',
  mounted() {
    // initialize canvas
    this.canvas = document.getElementById('telestrator');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.strokeStyle = 'yellow';
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    nodecg.listenFor('addTelestratorLine', this.telestratorLineAdded);
    nodecg.listenFor('clearTelestrator', this.clear);
  },
  methods: {
    mouseDown(e) {
      this.isMouseDown = true;
      this.lastPos = {
        x: e.pageX,
        y: e.pageY,
      };
    },

    mouseUp(e) {
      this.isMouseDown = false;

      const pos = {
        x: e.pageX,
        y: e.pageY,
      };

      if (this.lastPos.x != pos.x || this.lastPos.y != pos.y) {
        this.makeLine(this.lastPos, pos);
      }
    },

    mouseMove: _.throttle(function (e) {
      const pos = {
        x: e.pageX,
        y: e.pageY,
      };

      if (this.isMouseDown) {
        this.makeLine(this.lastPos, pos);
      }

      this.lastPos = pos;
    }, 20),

    makeLine(start, end) {
      nodecg.sendMessage('addTelestratorLine', {
        s: start,
        e: end,
        c: this.color,
        t: this.thickness,
      });
    },

    clearBtn() {
      nodecg.sendMessage('clearTelestrator');
    },

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    telestratorLineAdded(line) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = line.c;
      this.ctx.lineWidth = line.t;
      this.ctx.moveTo(line.s.x, line.s.y);
      this.ctx.lineTo(line.e.x, line.e.y);
      this.ctx.stroke();
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
      lines: [],
      canvas: null,
      ctx: null,
      isMouseDown: false,
      lastPos: {
        x: 0,
        y: 0,
      },
      color: '#ffff00',
      thickness: 5,
    };
  },
};
</script>
