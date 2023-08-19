<template>
  <v-app>
    <div id="top-section">
      <div class="player-name pga-box">
        <div class="pronouns">
          <swipe :visible="visible" dir="up" :delay="1">
            {{ player0pronouns }}
          </swipe>
        </div>

        <div class="name">
          <swipe dir="right" :visible="visible">
            <fit-text :max="2.5">
              {{ player0name }}
            </fit-text>
          </swipe>
        </div>
      </div>

      <div class="pga-box player-name right">
        <div class="pronouns">
          <swipe :visible="visible" dir="up" :delay="1">
            {{ player1pronouns }}
          </swipe>
        </div>

        <div class="name">
          <swipe dir="left" :visible="visible">
            <fit-text :max="2.5">
              {{ player1name }}
            </fit-text>
          </swipe>
        </div>
      </div>
    </div>

    <div style="position: absolute; top: 150px; left: 15px; width: 930px; height: 698px">
      <twitch-player
        :opacity="player0streamHidden ? 0 : 1"
        :playerNumber="0"
        :url="player0twitch"
        :quality="player0quality ? player0quality : 'auto'"
        :volume="player0streamHidden || !visible ? 0 : player0volume"
        :crop="player0crop"
        :aspectratio="player0aspectratio"
        :width="930"
        :height="698"></twitch-player>
    </div>

    <div style="position: absolute; top: 150px; left: 975px; width: 930px; height: 698px">
      <twitch-player
        :opacity="player1streamHidden ? 0 : 1"
        :playerNumber="1"
        :url="player1twitch"
        :quality="player1quality ? player1quality : 'auto'"
        :volume="player1streamHidden || !visible ? 0 : player1volume"
        :crop="player1crop"
        :aspectratio="player1aspectratio"
        :width="930"
        :height="698"></twitch-player>
    </div>

    <player-done-slider
      style="top: 848px; left: 15px; width: 930px"
      :state="player0raceState"
      :finalTime="player0finalTime">
    </player-done-slider>

    <player-done-slider
      style="top: 848px; left: 975px; width: 930px"
      :state="player1raceState"
      :finalTime="player1finalTime">
    </player-done-slider>

    <div id="bottom-section">
      <div id="game-box" class="pga-box">
        <swipe :visible="visible" dir="right" id="game-boxart" v-if="currentBoxart" :delay="0">
          <div class="d-flex align-center" style="height: 100%">
            <img :src="currentBoxart.url" />
          </div>
        </swipe>

        <div id="game-info">
          <swipe :visible="visible" dir="up" :delay="0" id="game">
            <fit-text :max="1" :min="0.1">
              {{ game }}
              <span v-if="!!platform"> ({{ platform }})</span>
            </fit-text>
          </swipe>

          <swipe :visible="visible" dir="up" :delay="0.8" id="goal">
            <fit-text :max="1" :min="0.1">
              {{ goal }}
            </fit-text>
          </swipe>

          <swipe :visible="visible" dir="up" :delay="1" id="submitter">
            <fit-text :max="1" :min="0.1"> Subbed by {{ submitter }} </fit-text>
          </swipe>
        </div>
      </div>

      <div id="logo-box">
        <div>
          <div id="round">
            <swipe dir="left" :visible="visible" :delay="0.8">
              <span>{{ round }}</span>
            </swipe>
          </div>
          <div id="timer">
            <swipe dir="left" :visible="visible" :delay="1">
              <span>{{ timerText }}</span>
            </swipe>
          </div>
        </div>

        <swipe dir="swing-left" :visible="visible">
          <img class="logo" id="logo" :src="currentEventLogo.url" />
        </swipe>
      </div>
    </div>

    <AchievementManager></AchievementManager>
    <Telestrator></Telestrator>
  </v-app>
</template>

<style lang="scss" scoped>
#top-section {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
}

.player-name {
  width: 930px;
  line-height: 1;
  margin-bottom: 15px;
  .pronouns {
    text-transform: none;
    background-color: white;
    font-family: 'OpenSerif Book', serif;
    color: #333;
    padding: 0.2em 1em !important;
  }

  .name {
    padding: 0.5em 1em !important;
  }

  &.right {
    text-align: right;
  }
}

#app {
  width: 1920px;
  height: 1080px;
  position: relative;
}

#bottom-section {
  position: absolute;
  bottom: 0px;
  width: 100%;
  height: 232px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
}

#game-box {
  display: flex;
  width: 930px;
}

#game-boxart {
  height: 100%;

  img {
    display: block;
    margin: 0 auto;
    max-height: 100%;
    max-width: 325px;
  }
}

#game-info {
  flex-grow: 1;
}

#game {
  width: 100%;
  text-transform: none;
  background-color: white;
  font-family: 'OpenSerif Book', serif;
  color: #333;
  padding: 0.2em 1rem !important;
  line-height: 1.2;
  font-size: 3em;
}

#goal {
  margin-top: 30px;
  padding: 0.1em 1rem !important;
  font-size: 2em;
  line-height: 1;
}

#submitter {
  padding: 0.1em 1rem !important;
  font-size: 1.5em;
  line-height: 1;
  font-weight: 300;
}

#logo-box {
  display: flex;
  align-items: flex-end;
}

#logo {
  display: block;
  opacity: 0.6;
  max-width: 300px;
  max-height: 200px;
}

#round {
  text-align: right;
  font-size: 3em;

  span {
    padding-right: 15px;
  }
}

#timer {
  text-align: right;
  font-size: 4em;
  line-height: 0.9;
  font-weight: bold;

  span {
    padding-right: 15px;
  }
}

.match-round {
  width: 100%;
  display: flex;
  font-size: 2em;
  justify-content: center;

  .match-round-inner {
    height: 100%;
  }
}

.pga-box {
  overflow: hidden;
  color: white;
  font-weight: bold;
  text-transform: uppercase;
  background: rgb(0, 113, 164);
  background: linear-gradient(135deg, rgba(0, 113, 164, 0.6) 0%, rgba(3, 30, 47, 0.6) 80%);
}
</style>

<script>
import { bindReplicant, formatTimer } from '../../util.js';

export default {
  created() {
    bindReplicant.call(this, 'game');
    bindReplicant.call(this, 'goal');
    bindReplicant.call(this, 'platform');
    bindReplicant.call(this, 'submitter');
    bindReplicant.call(this, 'currentBoxart');

    bindReplicant.call(this, 'timer');

    bindReplicant.call(this, 'showRainwave');

    bindReplicant.call(this, 'currentEventLogo');
    bindReplicant.call(this, 'round', 'match1round');

    for (let i = 0; i < 2; i++) {
      bindReplicant.call(this, `player${i}name`);
      bindReplicant.call(this, `player${i}pronouns`);

      bindReplicant.call(this, `player${i}twitch`);
      // bindReplicant.call(this, `player${i}quality`)
      bindReplicant.call(this, `player${i}volume`);
      bindReplicant.call(this, `player${i}streamHidden`);
      bindReplicant.call(this, `player${i}aspectratio`);

      bindReplicant.call(this, `player${i}raceState`);
      bindReplicant.call(this, `player${i}finalTime`);

      bindReplicant.call(this, `player${i}crop`);
    }

    if (window.obsstudio && window.obsstudio.getControlLevel && window.obsstudio.getControlLevel != 0) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log('Start scene: ' + scene.name);
        if (scene.name == '2 Player') {
          this.visible = true;
        }
      });

      window.addEventListener('obsSceneChanged', (event) => {
        console.log('Switched to scene ' + event.detail.name);
        if (event.detail.name == '2 Player') {
          this.visible = true;
        } else {
          this.visible = false;
        }
      });
    } else {
      this.visible = false;
      setTimeout(() => {
        this.visible = true;
      }, 0);
    }

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.visible = !this.visible;
      }
    });

    let vue = this;
    nodecg.listenFor('playSound', vue.playSound);
  },

  methods: {
    playSound(data) {
      nodecg.playSound(data.sound);
    },
  },

  computed: {
    timerText() {
      return formatTimer(this.timer.ms, false, false);
    },
  },

  data() {
    return {
      game: '',
      goal: '',
      platform: '',
      submitter: '',
      currentBoxart: '',

      currentEventLogo: {},
      round: '',

      player0name: '',
      player0pronouns: '',

      player0twitch: '',
      player0quality: null,
      player0volume: 0,
      player0streamHidden: false,

      player0raceState: 'none',
      player0finalTime: '',

      player0crop: [0, 0, 0, 0],
      player0aspectratio: false,

      player1name: '',
      player1pronouns: '',

      player1twitch: '',
      player1quality: null,
      player1volume: 0,
      player1streamHidden: false,

      player1raceState: 'none',
      player1finalTime: '',

      player1crop: [0, 0, 0, 0],
      player1aspectratio: false,

      timer: {
        ms: 0,
      },

      showRainwave: false,

      visible: false,
    };
  },
};
</script>
