<template>
  <canvas
  id="telestrator"
    @mousedown="mouseDown"
    @mouseup="mouseUp"
    @mousemove="mouseMove"
    >

  </canvas>
</template>

<style lang="scss" scoped>
  canvas {
    background-color: rgba(0, 0, 0, 0);
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
  }
</style>

<script>
const telestratorLinesRep = nodecg.Replicant("telestratorLines");

export default {
  name: "Telestrator",
  mounted() {
    // initialize canvas
    this.canvas = document.getElementById("telestrator");
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.strokeStyle = "yellow";
    this.ctx.lineWidth = 5;

    telestratorLinesRep.on("change", (newVal) => {
      this.redraw();
    });
  },
  methods: {
    mouseDown(e) {
      this.isMouseDown = true;
      this.lastPos = {
        x: e.offsetX,
        y: e.offsetY
      };
    },

    mouseUp() {
      this.isMouseDown = false;
    },

    mouseMove: _.throttle(function(e) {
        const pos = {
          x: e.offsetX,
          y: e.offsetY
        };

      if (this.isMouseDown) {

        nodecg.sendMessage("addTelestratorLine", {
          start: this.lastPos,
          end: pos
        });
      }

      this.lastPos = pos;
    }, 50),

    redraw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      telestratorLinesRep.value.forEach((line) => {
        this.ctx.beginPath();
        this.ctx.moveTo(line.start.x, line.start.y);
        this.ctx.lineTo(line.end.x, line.end.y);
        this.ctx.stroke();
      });
    }
  },

  data() {
    return {
      canvas: null,
      ctx: null,
      isMouseDown: false,
      lastPos: {
        x: 0,
        y: 0
      }
    }
  },
}
</script>