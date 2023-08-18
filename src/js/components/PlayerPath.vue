<template>
  <div class="player-path" v-if="info">
    <h1>{{ apostrophe(info.name) }} matches</h1>

    <div class="timeline-wrap" ref="timelineWrap">
      <v-timeline v-if="info.matches.length > 0" dense light>
        <v-timeline-item v-for="match of info.matches" :key="match.id" large class="align-center" color="transparent">
          <template v-slot:icon>
            <v-avatar>
              <img :src="match.players[1].avatar" />
            </v-avatar>
          </template>

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
            <span class="platform"> <v-icon>mdi-gamepad-variant</v-icon>{{ match.platform }}</span>
            {{ match.game ? match.game : 'Unknown' }}
          </div>
        </v-timeline-item>
      </v-timeline>

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
  width: (1920 - $padding * 3) / 2;

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

export default {
  props: ['info'],

  methods: {
    apostrophe,
    animateScroll() {
      clearInterval(this.interval);

      setTimeout(() => {
        let el = this.$refs.timelineWrap;

        if (el.scrollTo) {
          var height = el.scrollHeight - el.offsetHeight;

          if (height > 0) {
            var currentHeight = 0;
            var bool = true;
            var step = 0.5;
            var speed = 1 / 60;
            this.interval = setInterval(scrollpage, speed);

            function scrollpage() {
              if (currentHeight < -200 || currentHeight > height + 200) bool = !bool;
              if (bool) {
                el.scrollTo(0, (currentHeight += step));
              } else {
                // if you don't want to continue scroll
                // clearInterval(interval) use clearInterval
                el.scrollTo(0, (currentHeight -= step));
              }
            }
          }
        }
      }, 0);
    },
  },

  watch: {
    info() {
      this.animateScroll();
    },
  },

  data() {
    return {
      interval: null,
    };
  },
};
</script>
