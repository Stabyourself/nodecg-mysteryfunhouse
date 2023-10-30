<template>
  <div class="player-backdrop" :style="{ width: width + 'px', height: height + 'px' }">
    <div class="player-wrapper" :style="cropStyles" ref="player"></div>
    <div class="popover-holder">
      <img :class="{ active: popoverVisible }" :src="popover" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.player-backdrop {
  // background-color: black;
  overflow: hidden;
  position: relative;
}

.player-wrapper {
  position: absolute;
}

.popover-holder {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;

    width: 60%;
    opacity: 0;
    transition: opacity 0.2s;

    &.active {
      opacity: 1;
    }
  }
}
</style>

<script>
import { bindReplicant } from '../util.js';

let twitchOptions = {
  channel: null,
  autoplay: true,
  muted: false,
  parent: ['nodecg.guegan.de'],
  quality: 'auto',
};

let playerWidth = 930;
let playerHeight = 698;

export default {
  created() {
    nodecg.listenFor(`stream${this.playerNumber}reload`, () => {
      this.createPlayer();
    });
    bindReplicant.call(this, 'qualities', `player${this.playerNumber}qualities`);

    bindReplicant.call(this, 'popover', `player${this.playerNumber}popover`);
    bindReplicant.call(this, 'popoverVisible', `player${this.playerNumber}popoverVisible`);
  },

  mounted() {
    if (this.url) {
      this.createPlayer();
    }
  },

  unmounted() {
    this.$refs.player.innerHTML = '';
  },

  methods: {
    createPlayer() {
      this.$refs.player.innerHTML = '';

      twitchOptions.channel = this.url;
      // twitchOptions.video = "1232657574";
      twitchOptions.width = playerWidth;
      twitchOptions.height = playerHeight;

      this.player = new Twitch.Player(this.$refs.player, twitchOptions);

      this.player.addEventListener(Twitch.Player.READY, () => {
        this.player.setMuted(false);
        this.player.setVolume(this.volume / 100);

        // setInterval(() => {
        //     this.qualities = this.player.getQualities()
        // }, 5000)
      });
    },
  },

  computed: {
    cropStyles() {
      let styles = {};

      if (this.crop) {
        let left = this.crop[0];
        let right = this.crop[1];
        let top = this.crop[2];
        let bottom = this.crop[3];

        let width = playerWidth - left - right;
        let height = playerHeight - top - bottom;

        let translateX = this.width / 2 - left - width / 2;
        let translateY = this.height / 2 - top - height / 2;

        let transformOriginX = left + width / 2;
        let transformOriginY = top + height / 2;

        let hScale = this.width / width;
        let vScale = this.height / height;

        if (this.aspectratio) {
          let split = this.aspectratio.split(':');
          let targetAspect = split[0] / split[1];

          let aspectRatio = width / height;

          if (aspectRatio > targetAspect) {
            hScale = vScale * (targetAspect / aspectRatio);
          } else {
            vScale = hScale / (targetAspect / aspectRatio);
          }

          if (hScale * width > this.width) {
            let diff = this.width / (hScale * width);
            hScale = hScale * diff;
            vScale = vScale * diff;
          }

          if (vScale * height > this.height) {
            let diff = this.height / (vScale * height);
            hScale = hScale * diff;
            vScale = vScale * diff;
          }
        } else {
          //auto scale to touch our 4:3 from the inside
          let scale = Math.min(hScale, vScale);

          hScale = scale;
          vScale = scale;
        }

        styles = {
          clip: `rect(
                                ${top}px,
                                ${playerWidth - right}px,
                                ${playerHeight - bottom}px,
                                ${left}px
                            )`,
          'transform-origin': `${transformOriginX}px ${transformOriginY}px`,
          transform: `translate(${translateX}px, ${translateY}px) scaleX(${hScale}) scaleY(${vScale})`,
        };
      }

      styles.opacity = this.opacity ?? 1;

      return styles;
    },
  },

  watch: {
    url() {
      this.createPlayer();
    },

    volume(newValue) {
      this.player.setVolume(newValue / 100);
    },

    quality(newValue) {
      // this.player.setQuality(newValue)
    },
  },

  props: ['url', 'volume', 'playerNumber', 'crop', 'quality', 'opacity', 'width', 'height', 'aspectratio'],

  data() {
    return {
      player: null,
      qualities: [],
      popover: null,
      popoverVisible: false,
    };
  },
};
</script>
