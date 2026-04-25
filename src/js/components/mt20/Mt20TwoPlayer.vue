<template>
  <v-app>
    <div class="twoplayers">
    <div id="top-section">
      <mt20-player-box :player="player0" :visible="visible" side="left" :health="player0health" :time="player0finalTime" :race-state="player0raceState" />
      <img class="logo" :src="currentEventLogo.url" style="height: 147px"/>
      <mt20-player-box :player="player1" :visible="visible" side="right" :health="player1health" :time="player1finalTime" :race-state="player1raceState" />
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
        :height="698"
      ></twitch-player>

      <twitch-player
        :opacity="player1streamHidden ? 0 : 1"
        :playerNumber="1"
        :url="player1twitch"
        :quality="player1quality ? player1quality : 'auto'"
        :volume="player1streamHidden || !visible ? 0 : player1volume"
        :crop="player1crop"
        :aspectratio="player1aspectratio"
        :width="930"
        :height="698"
      ></twitch-player>
    </div>

    <div id="bottom-section">
      <mt20-game-timer-box :game="game" :goal="goal" :submitter="submitter" :visible="visible" :boxart="currentBoxart" :timer="timerText" :round="round" />
    </div>

    <rainwave v-if="showRainwave" style="top: 975px; left: 1521px; width: 444px; height: 124px"> </rainwave>

    <AchievementManager />
    <!-- <Telestrator v-if="showTelestrator"/> -->
  </div>
  </v-app>
</template>

<style lang="scss" scoped>
$whiteBoxFont: 'Arvo', serif;

#app {
  width: 1920px;
  height: 1080px;
  position: relative;
}

.twoplayers {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  gap: 15px;
}

#top-section {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

#player-section {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

#bottom-section {
  max-width: 1200px;
}
</style>

<script>
import { bindReplicant, formatTimer } from '../../util.js';

let iadd = 0;
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('match2') != null) {
  iadd = 2;
}

export default {
  created() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('obs') != null) {
      this.showTelestrator = false;
    }

    bindReplicant.call(this, 'game');
    bindReplicant.call(this, 'goal');
    bindReplicant.call(this, 'platform');
    bindReplicant.call(this, 'submitter');
    bindReplicant.call(this, 'currentBoxart');

    bindReplicant.call(this, 'timer');

    bindReplicant.call(this, 'showRainwave');

    bindReplicant.call(this, 'currentEventLogo');
    bindReplicant.call(this, 'round', `match${1 + iadd / 2}round`);

    for (let i = 0; i < 2; i++) {
      bindReplicant.call(this, `player${i}name`, `player${i + iadd}name`);
      bindReplicant.call(this, `player${i}pronouns`, `player${i + iadd}pronouns`);
      bindReplicant.call(this, `player${i}flag`, `player${i + iadd}flag`);

      bindReplicant.call(this, `player${i}twitch`, `player${i + iadd}twitch`);
      // bindReplicant.call(this, `player${i}quality`, `player${i + iadd}quality`)
      bindReplicant.call(this, `player${i}volume`, `player${i + iadd}volume`);
      bindReplicant.call(this, `player${i}streamHidden`, `player${i + iadd}streamHidden`);

      bindReplicant.call(this, `player${i}raceState`, `player${i + iadd}raceState`);
      bindReplicant.call(this, `player${i}finalTime`, `player${i + iadd}finalTime`);

      bindReplicant.call(this, `player${i}crop`, `player${i + iadd}crop`);
      bindReplicant.call(this, `player${i}aspectratio`, `player${i + iadd}aspectratio`);
    }

    if (window.obsstudio && window.obsstudio.getControlLevel && window.obsstudio.getControlLevel != 0) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log('Start scene: ' + scene.name);
        if (scene.name == '2 Player' || scene.name == '2 Player (Match 2)') {
          this.visible = true;
        }
      });

      window.addEventListener('obsSceneChanged', (event) => {
        console.log('Switched to scene ' + event.detail.name);
        if (event.detail.name == '2 Player' || event.detail.name == '2 Player (Match 2)') {
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

    player0health() {
      if (this.timer.ms == 0) {
        return 0;
      }

      let hp = 1;
      if (this.round.toLowerCase().includes("loser")) {
        hp = 0.5;
      }

      if (this.player1raceState == "winner" || this.player0raceState == "forfeit") {
        hp -= 0.5;
      }

      return hp;
    },

    player1health() {
      if (this.timer.ms == 0) {
        return 0;
      }

      let hp = 1;
      if (this.round.toLowerCase().includes("loser")) {
        hp = 0.5;
      }

      if (this.player0raceState == "winner" || this.player1raceState == "forfeit") {
        hp -= 0.5;
      }

      return hp;
    }
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
      showTelestrator: true,
    };
  },
};
</script>
