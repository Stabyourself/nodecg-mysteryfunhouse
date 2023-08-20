<template>
  <v-app>
    <DroneShotManager />

    <div id="videodimmer" />

    <swipe :visible="visible" dir="down">
      <div class="logo-container">
        <img class="logo" :src="currentEventLogo.url" />
      </div>
    </swipe>

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

    <rainwave v-if="showRainwave" style="top: 975px; left: 1521px; width: 444px; height: 124px" />

    <AchievementManager />
  </v-app>
</template>

<style scoped lang="scss">
$whiteBoxFont: 'Arvo', serif;

video {
  position: absolute;
  top: 0px;
  left: 0px;
}

#videodimmer {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 1920px;
  height: 1080px;
  background-color: rgba(0, 0, 0, 0.3);
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

.match {
  margin: 0 auto;
  width: 1200px;
  margin-bottom: 25px;
  color: #f58038;

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
