<template>
  <div class="player-path" v-if="info">
    <h1>{{ apostrophe(info.name) }} matches</h1>

    <div class="timeline-wrap" ref="timelineWrap">
      <!-- same markup Vuetify 2's v-timeline / v-avatar / v-icon rendered, styled by
           src/scss/graphics-legacy.css -->
      <div v-if="info.matches.length > 0" class="v-timeline v-timeline--dense theme--light">
        <div v-for="match of info.matches" :key="match.id" class="v-timeline-item align-center theme--light">
          <div class="v-timeline-item__body">
            <div class="match">
              <div class="round">{{ match.round }}</div>
              <div class="opponent">{{ match.players[1].name }}</div>

              <div
                class="score"
                :class="{
                  'green--text': match.winner == 0,
                  'red--text': match.winner == 1,
                }">
                {{ match.score }}
              </div>
            </div>

            <div class="game">
              <span class="platform"><i aria-hidden="true" class="v-icon notranslate mdi mdi-gamepad-variant theme--light"></i>{{ match.platform }}</span>
              {{ match.game ? match.game : 'Unknown' }}
            </div>
          </div>

          <div class="v-timeline-item__divider">
            <div class="v-timeline-item__dot v-timeline-item__dot--large">
              <div class="v-timeline-item__inner-dot transparent">
                <div class="v-avatar" style="height: 48px; min-width: 48px; width: 48px">
                  <img :src="match.players[1].avatar" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else style="font-size: 1.5em" class="mt-10">No matches yet!</div>
    </div>
  </div>
</template>

<style lang="scss">
.timeline-wrap {
  height: calc(100% - 40px);
  overflow-y: auto;

  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
}

$padding: 100px;

.player-path {
  h1 {
    font-size: 2.5em;
  }

  background-color: rgba(0, 0, 0, 0.7);
  position: absolute;

  top: $padding;
  left: $padding;
  height: 1080 - $padding * 2;
  width: (1920 - $padding * 3) * 0.5;

  padding: 20px;
  text-align: center;

  border-radius: 20px;

  opacity: 0;
  transform: translateY(200px);
  transition-delay: 0;

  &.right {
    left: 960 + $padding * 0.5;
  }

  &.active {
    opacity: 1;
    transform: translateY(0px);
    transition-delay: 1s;
  }

  transition: transform 0.6s, opacity 0.6s;

  overflow-y: hidden;

  .v-avatar {
    border: 2px solid white;
  }

  .match {
    display: flex;
    text-align: left;
    font-size: 2em;
    align-items: center;
    margin-top: 0.7em;

    .round {
      font-size: 0.8em;
      font-weight: 200;
      min-width: 150px;
    }

    .opponent {
      font-weight: 700;
      flex-grow: 1;
    }

    .score {
      font-size: 1.5em;
      font-weight: 300;
      line-height: 0;
      margin-right: 15px;
      white-space: nowrap;
    }
  }

  .game {
    width: 100%;
    text-align: left;

    .platform {
      background-color: white;
      padding: 2px 6px;
      border-radius: 5px;
      margin-right: 3px;
      color: #111;
    }
  }

  .v-timeline::before {
    top: 55px !important;
    height: calc(100% - 110px) !important;
  }

  .theme--light.v-timeline::before {
    background: rgba(255, 255, 255, 0.24) !important;
  }

  .theme--light.v-timeline .v-timeline-item__dot {
    background: #111 !important;
  }
}
</style>

<script>
import { apostrophe } from '../util.js';

// px per second, about what the old 4ms interval did
const SCROLL_SPEED = 120;
// how far it keeps going past each end before it turns around, so it rests there a moment
const SCROLL_OVERSHOOT = 200;

export default {
  props: ['info'],

  beforeUnmount() {
    this.stopScroll();
  },

  methods: {
    apostrophe,
    animateScroll() {
      this.stopScroll();

      setTimeout(() => {
        let el = this.$refs.timelineWrap;
        if (!el || !el.scrollTo) return;

        const height = el.scrollHeight - el.offsetHeight;
        if (height <= 0) return;

        let position = 0;
        let direction = 1;
        let last = performance.now();

        const step = (now) => {
          // a long gap (page hidden) shouldn't jump
          const dt = Math.min(now - last, 100) / 1000;
          last = now;

          position += direction * SCROLL_SPEED * dt;
          if (position < -SCROLL_OVERSHOOT || position > height + SCROLL_OVERSHOOT) direction = -direction;

          el.scrollTo(0, position);
          this.scrollFrame = requestAnimationFrame(step);
        };

        this.scrollFrame = requestAnimationFrame(step);
      }, 0);
    },

    stopScroll() {
      cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    },
  },

  watch: {
    info() {
      this.animateScroll();
    },
  },
};
</script>
