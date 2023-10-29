<template>
  <v-app>
    <div id="top-section">
      <mt18-player-box :player="player0" :visible="visible" side="left" />
      <mt18-player-box :player="player1" :visible="visible" side="right" />
    </div>

    <div id="player-section">
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

    <div id="bottom-section">
      <mt18-game-box :game="game" :goal="goal" :submitter="submitter" :visible="visible" :boxart="currentBoxart" />

      <mt18-logo-box :round="round" :timer="timerText" :logo="currentEventLogo" :visible="visible"></mt18-logo-box>
    </div>

    <AchievementManager />
    <Telestrator />
  </v-app>
</template>

<style lang="scss" scoped>
$whiteBoxFont: 'Arvo', serif;

#app {
  width: 1920px;
  height: 1080px;
  position: relative;
}

#top-section {
  width: 100%;
  height: 150px;
  padding: 0 15px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 15px;
}

#player-section {
  display: flex;
  justify-content: space-around;
}

#bottom-section {
  position: absolute;
  bottom: 0px;
  width: 100%;
  height: 232px;
  padding: 15px;
  padding-top: 30px;
  display: flex;
  justify-content: space-between;
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
      bindReplicant.call(this, `player${i}flag`);

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
  },

  data() {
    return {
      game: '',
      goal: '',
      platform: '',
      submitter: '',
      currentBoxart: {},

      currentEventLogo: {},
      round: '',

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

      timer: {
        ms: 0,
      },

      showRainwave: false,

      visible: false,
    };
  },
};
</script>
