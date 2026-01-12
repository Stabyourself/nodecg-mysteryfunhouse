<template>
  <v-app>
    <div id="scene">
      <div id="megaman-scroll">
        <div class="top"></div>
        <div class="bottom"></div>
      </div>

      <div id="megaman-walking">
        <img src="/bundles/nodecg-mysteryfunhouse/dist/img/mt20/megaman_walking.gif" />
      </div>

      <swipe :visible="visible" dir="down">
        <div class="logo-container">
          <img class="logo" :src="currentEventLogo.url" />
        </div>
      </swipe>

      <div class="black-area">
        <div class="matches">
          <div v-for="(match, i) in slicedSchedule" :key="match.match" class="match">
            <swipe :delay="i * 0.3 + 1" :visible="visible" dir="right">
              <div class="top">
                <div class="left">
                  {{ match.round }}
                </div>
                <div class="right">
                  {{
                    new Date(match.time)
                      .toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        timeZoneName: 'short',
                      })
                      .replace(':00 ', ' ')
                  }}
                </div>
              </div>

              <div class="bottom">
                <div>
                  {{ match.player1 }}
                  <span class="vs">vs.</span>
                  {{ match.player2 }}
                </div>

                <div class="round">
                  {{ getRelativeTime(match.time) }}
                </div>
              </div>
            </swipe>
          </div>
        </div>
      </div>
    </div>

    <!-- <rainwave v-if="showRainwave" style="top: 975px; left: 1521px; width: 444px; height: 124px" /> -->

    <AchievementManager />
  </v-app>
</template>

<style scoped lang="scss">
$whiteBoxFont: 'Arvo', serif;

#scene {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  position: relative;
  background-color: black;
}

#megaman-scroll {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 560px;

  image-rendering: crisp-edges;
  image-rendering: pixelated;

  .top {
    background: url('/bundles/nodecg-mysteryfunhouse/dist/img/mt20/coming_soon_scroll_top.png') repeat-x;
    width: 100%;
    height: 320px;
    animation: scroll-bg 60s linear infinite;
  }

  .bottom {
    background: url('/bundles/nodecg-mysteryfunhouse/dist/img/mt20/coming_soon_scroll_bottom.png') repeat-x;
    width: 7680px;
    height: 240px;
    animation: scroll-bg 30s linear infinite;
  }

  .top, .bottom {
    background-size: cover;
    z-index: 0;
  }
}

#megaman-walking {
  position: absolute;
  top: 205px;
  left: 70%;
  transform: translateX(-50%);
  z-index: 1;

  img {
    width: 125px;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
}

@keyframes scroll-bg {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 7680px 0;
  }
}

.logo-container {
  width: 100%;
  display: flex;
  justify-content: center;

  .logo {
    margin: 10px 0;
    height: 200px;
    object-fit: contain;
  }
}

.black-area {
  position: absolute;
  top: 560px;
  width: 100%;
  bottom: 0px;
  padding: 20px;
}

.match {
  margin: 0 auto;
  width: 1200px;
  margin-bottom: 25px;
  color: #f58038;
  z-index: 2;
  position: relative;

  .top {
    background-color: white;
    font-family: $whiteBoxFont;
    color: #333;
    padding: 0 1rem !important;
    line-height: 1.4;
    font-size: 2em;
    font-weight: 700;
    display: flex;
    justify-content: space-between;

    .right {
      text-align: right;
    }
  }

  .bottom {
    padding: 0 1rem !important;
    overflow: hidden;
    color: white;
    font-weight: bold;
    text-transform: uppercase;
    background: rgb(0, 113, 164);
    background: linear-gradient(135deg, rgba(0, 113, 164, 0.6) 0%, rgba(3, 30, 47, 0.6) 80%);
    font-size: 2em;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100px;
    line-height: 1.2;

    .vs {
      font-weight: 200;
      margin: 0 0.3rem;
    }

    .round {
      font-weight: 200;
      font-size: 0.9em;
    }
  }
}
</style>

<script>
import { bindReplicant } from '../../util.js';

export default {
  methods: {
    getRelativeTime(datestring) {
      const now = new Date();
      const diff = new Date(datestring) - now;

      // get days, hours and minutes of difference
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let out = 'In ';

      if (days > 0) {
        out += days + ' day' + (days != 1 ? 's' : '');
      }

      if (days > 0 || hours > 0) {
        out += ' ' + hours + ' hour' + (hours != 1 ? 's' : '');
      }

      out += ' ' + minutes + ' minute' + (minutes != 1 ? 's' : '');

      return out;
    },
  },

  created() {
    bindReplicant.call(this, 'currentEventLogo');
    bindReplicant.call(this, 'schedule');
    bindReplicant.call(this, 'showRainwave');

    if (window.obsstudio && window.obsstudio.getControlLevel && window.obsstudio.getControlLevel != 0) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log('Start scene: ' + scene.name);
        if (scene.name == 'Coming Up') {
          this.visible = true;
        }
      });

      window.addEventListener('obsSceneChanged', (event) => {
        console.log('Switched to scene ' + event.detail.name);
        if (event.detail.name == 'Coming Up') {
          this.visible = true;
        } else {
          this.visible = false;
        }
      });
    } else {
      this.visible = false;
      setTimeout(() => {
        this.visible = true;
      }, 1000);
    }

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.visible = !this.visible;
      }
    });
  },

  computed: {
    slicedSchedule() {
      return this.schedule.slice(0, 5);
    },
  },

  data() {
    return {
      schedule: [],
      visible: false,
      showRainwave: false,
      currentEventLogo: {},
    };
  },
};
</script>
