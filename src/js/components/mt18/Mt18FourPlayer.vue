<template>
  <v-app>
    <div id="section-wrapper">
      <!-- <div style="position: absolute; top: 0px; right: 10px; width: 1322px" class="round pixel-font">
      {{ round1 }}
    </div>

    <div style="position: absolute; top: 1037px; right: 10px; width: 1322px" class="round pixel-font">
      {{ round2 }}
    </div> -->

      <div class="info-holder">
        <mt18-logo-box :logo="currentEventLogo" :visible="visible"></mt18-logo-box>
        <mt18-game-box
          :game="game"
          :goal="goal"
          :submitter="submitter"
          :visible="visible"
          :boxart="currentBoxart"
          style="min-height: 200px"
          class="compact" />

        <div class="timer">{{ timerText }}</div>

        <div class="game-box-holder"></div>
      </div>

      <div id="main-section">
        <div class="main-row">
          <mt18-player-box :player="player0" :visible="visible" side="left" class="compact" />
          <div class="round">{{ round1 }}</div>
          <mt18-player-box :player="player1" :visible="visible" side="right" class="compact" />
        </div>

        <div class="main-row">
          <twitch-player
            :opacity="player0streamHidden ? 0 : 1"
            :playerNumber="0"
            :url="player0twitch"
            :quality="player0quality ? player0quality : 'auto'"
            :volume="player0streamHidden || !visible ? 0 : player0volume"
            :crop="player0crop"
            :aspectratio="player0aspectratio"
            :width="656"
            :height="492"></twitch-player>

          <twitch-player
            :opacity="player1streamHidden ? 0 : 1"
            :playerNumber="1"
            :url="player1twitch"
            :quality="player1quality ? player1quality : 'auto'"
            :volume="player1streamHidden || !visible ? 0 : player1volume"
            :crop="player1crop"
            :aspectratio="player1aspectratio"
            :width="656"
            :height="492"></twitch-player>
        </div>

        <div class="spacer"></div>

        <div class="main-row">
          <twitch-player
            :opacity="player2streamHidden ? 0 : 1"
            :playerNumber="2"
            :url="player2twitch"
            :quality="player2quality ? player2quality : 'auto'"
            :volume="player2streamHidden || !visible ? 0 : player2volume"
            :crop="player2crop"
            :aspectratio="player2aspectratio"
            :width="656"
            :height="492"></twitch-player>

          <twitch-player
            :opacity="player3streamHidden ? 0 : 1"
            :playerNumber="3"
            :url="player3twitch"
            :quality="player3quality ? player3quality : 'auto'"
            :volume="player3streamHidden || !visible ? 0 : player3volume"
            :crop="player3crop"
            :aspectratio="player3aspectratio"
            :width="656"
            :height="492"></twitch-player>
        </div>

        <div class="main-row">
          <mt18-player-box :player="player2" :visible="visible" side="left" class="compact" />
          <div class="round">{{ round2 }}</div>
          <mt18-player-box :player="player3" :visible="visible" side="right" class="compact" />
        </div>
      </div>
    </div>

    <AchievementManager></AchievementManager>
    <Telestrator />
  </v-app>
</template>

<style lang="scss" scoped>
#section-wrapper {
  width: 1920px;
  height: 1080px;
  position: relative;
}

#main-section {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  position: absolute;
  top: 0px;
  right: 0px;
  width: 1322px;
  height: 1080px;

  .spacer {
    flex-grow: 1;
  }
}

.main-row {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.boxart {
  margin-right: 15px;
  height: 100%;
  max-height: 200px;

  img {
    display: block;
    margin: 0 auto;
    max-height: 100%;
    max-width: 335px;
  }
}

.logo {
  font-size: 3em;

  .logo-small {
    font-size: 0.3em;
  }
}

.info-holder {
  padding: 20px;
  position: relative;
  height: 100%;
  width: 598px;

  display: flex;
  flex-direction: column;
  gap: 50px;
  align-items: center;

  .timer {
    font-size: 4em;
    line-height: 0.9;
    font-weight: 700;
  }
}

.game-box-holder {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  padding: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  #game-box {
    width: 100%;
  }
}

.round {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
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

    bindReplicant.call(this, 'currentEventLogo');
    bindReplicant.call(this, 'round1', 'match1round');
    bindReplicant.call(this, 'round2', 'match2round');

    for (let i = 0; i < 4; i++) {
      bindReplicant.call(this, `player${i}name`);
      bindReplicant.call(this, `player${i}pronouns`);
      bindReplicant.call(this, `player${i}flag`);

      bindReplicant.call(this, `player${i}twitch`);
      // bindReplicant.call(this, `player${i}quality`)
      bindReplicant.call(this, `player${i}volume`);
      bindReplicant.call(this, `player${i}streamHidden`);

      bindReplicant.call(this, `player${i}raceState`);
      bindReplicant.call(this, `player${i}finalTime`);

      bindReplicant.call(this, `player${i}crop`);
      bindReplicant.call(this, `player${i}aspectratio`);
    }

    if (window.obsstudio && window.obsstudio.getControlLevel && window.obsstudio.getControlLevel != 0) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log('Start scene: ' + scene.name);
        if (scene.name == '4 Player') {
          this.visible = true;
        }
      });

      window.addEventListener('obsSceneChanged', (event) => {
        console.log('Switched to scene ' + event.detail.name);
        if (event.detail.name == '4 Player') {
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

    player0() {
      return {
        name: this.player0name,
        pronouns: this.player0pronouns,
        flag: this.player0flag,
        volume: this.player0volume,
        raceState: this.player0raceState,
        finalTime: this.player0finalTime,
      };
    },

    player1() {
      return {
        name: this.player1name,
        pronouns: this.player1pronouns,
        flag: this.player1flag,
        volume: this.player1volume,
        raceState: this.player1raceState,
        finalTime: this.player1finalTime,
      };
    },

    player2() {
      return {
        name: this.player2name,
        pronouns: this.player2pronouns,
        flag: this.player2flag,
        volume: this.player2volume,
        raceState: this.player2raceState,
        finalTime: this.player2finalTime,
      };
    },

    player3() {
      return {
        name: this.player3name,
        pronouns: this.player3pronouns,
        flag: this.player3flag,
        volume: this.player3volume,
        raceState: this.player3raceState,
        finalTime: this.player3finalTime,
      };
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
      round1: '',
      round2: '',

      player0name: '',
      player0pronouns: '',
      player0flag: '',

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
      player1flag: '',

      player1twitch: '',
      player1quality: null,
      player1volume: 0,
      player1streamHidden: false,

      player1raceState: 'none',
      player1finalTime: '',

      player1crop: [0, 0, 0, 0],
      player1aspectratio: false,

      player2name: '',
      player2pronouns: '',
      player2flag: '',

      player2twitch: '',
      player2quality: null,
      player2volume: 0,
      player2streamHidden: false,

      player2raceState: 'none',
      player2finalTime: '',

      player2crop: [0, 0, 0, 0],
      player2aspectratio: false,

      player3name: '',
      player3pronouns: '',
      player3flag: '',

      player3twitch: '',
      player3quality: null,
      player3volume: 0,
      player3streamHidden: false,

      player3raceState: 'none',
      player3finalTime: '',

      player3crop: [0, 0, 0, 0],
      player3aspectratio: false,

      timer: {
        ms: 0,
      },

      visible: false,
    };
  },
};
</script>
