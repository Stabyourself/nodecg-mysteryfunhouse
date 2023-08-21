<template>
  <v-app>
    <div id="top-section">
      <div class="playerinfo-box">
        <div class="player-name">
          <div class="pronouns">
            <swipe :visible="visible" dir="right" :delay="0.3">
              <span>{{ player0pronouns }}</span>
            </swipe>
          </div>

          <swipe dir="down" :visible="visible" :delay="0.2">
            <div class="name-box pga-box">
              <div class="name">
                <fit-text :max="2.5">
                  {{ player0name }}
                </fit-text>
              </div>
              <div class="audio">
                <v-icon v-if="player0volume > 0"> mdi-volume-high </v-icon>
              </div>
            </div>
          </swipe>
        </div>

        <div class="done-holder">
          <div class="done-slider" :class="{ on: player0raceState != 'none' }">
            <div class="left" :class="player0raceState" v-if="player0raceState == 'winner'">
              1<span class="small">st</span>
            </div>

            <div class="left" :class="player0raceState" v-if="player0raceState == 'loser'">
              2<span class="small">nd</span>
            </div>

            <div class="left" :class="player0raceState" v-if="player0raceState == 'forfeit'">FF</div>

            <div class="left" :class="player0raceState" v-if="player0raceState == 'none'"></div>

            <div class="right">{{ player0finalTime }}</div>
          </div>
        </div>
      </div>

      <div class="playerinfo-box">
        <div class="done-holder">
          <div class="done-slider right" :class="{ on: player1raceState != 'none' }">
            <div class="left" :class="player1raceState" v-if="player1raceState == 'winner'">
              1<span class="small">st</span>
            </div>

            <div class="left" :class="player1raceState" v-if="player1raceState == 'loser'">
              2<span class="small">nd</span>
            </div>

            <div class="left" :class="player1raceState" v-if="player1raceState == 'forfeit'">FF</div>

            <div class="left" :class="player1raceState" v-if="player1raceState == 'none'"></div>

            <div class="right">{{ player1finalTime }}</div>
          </div>
        </div>

        <div class="player-name right">
          <div class="pronouns">
            <swipe :visible="visible" dir="left" :delay="0.3">
              <span>{{ player1pronouns }}</span>
            </swipe>
          </div>

          <swipe dir="down" :visible="visible" :delay="0.2">
            <div class="name-box pga-box">
              <div class="audio">
                <v-icon v-if="player1volume > 0"> mdi-volume-high </v-icon>
              </div>
              <div class="name">
                <fit-text :max="2.5">
                  {{ player1name }}
                </fit-text>
              </div>
            </div>
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

    <div id="bottom-section">
      <div id="game-box" class="pga-box">
        <swipe :visible="visible" dir="down" id="game-boxart" v-if="currentBoxart" :delay="0">
          <div class="d-flex align-center" style="height: 100%">
            <img :src="currentBoxart.url" />
          </div>
        </swipe>

        <div id="game-info">
          <swipe :visible="visible" dir="down" :delay="0">
            <div id="game">
              <fit-text :max="1" :min="0.1">
                {{ game }}
                <span v-if="!!platform"> ({{ platform }})</span>
              </fit-text>
            </div>
          </swipe>

          <div id="game-info-body">
            <swipe :visible="visible" dir="right" :delay="0.8">
              <div id="goal">
                {{ goal }}
              </div>
            </swipe>

            <swipe :visible="visible" dir="right" :delay="1" v-if="submitter != ''">
              <div id="submitter">
                <fit-text :max="1" :min="0.1"> Submitted by {{ submitter }} </fit-text>
              </div>
            </swipe>
          </div>
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

        <swipe dir="swing-left" :visible="visible" :delay="0">
          <img class="logo" id="logo" :src="currentEventLogo.url" />
        </swipe>
      </div>
    </div>

    <AchievementManager></AchievementManager>
    <Telestrator></Telestrator>
  </v-app>
</template>

<style lang="scss" scoped>
$whiteBoxFont: 'Arvo', serif;

.done-holder {
  display: flex;
  overflow: hidden;
}

.done-slider {
  display: flex;
  font-size: 3rem;
  color: #333;
  align-items: center;

  transform: translateX(-101%);

  padding-left: 15px;
  &.right {
    transform: translateX(101%);
    flex-direction: row-reverse;
    padding-right: 15px;
    padding-left: 0px;
  }

  transition: transform 1s;

  &.on {
    transform: translateX(0%);
  }

  .left {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 78px;
    font-weight: 700;

    background-color: white;

    &.winner {
      background-color: gold;
    }

    &.loser {
      background-color: silver;
    }

    &.forfeit {
      background-color: #f58038;
    }

    .small {
      font-size: 0.3em;
      margin-bottom: 20px;
    }
  }

  .right {
    background-color: white;
    font-weight: 200;
    height: 100%;
    display: flex;
    align-items: center;
    padding: 0 15px;
  }
}

#top-section {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 150px;
  padding: 0 15px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.playerinfo-box {
  display: flex;
  margin-bottom: 15px;
}

.player-name {
  width: 575px;
  line-height: 1;
  .pronouns {
    text-transform: none;
    background-color: white;
    font-family: $whiteBoxFont;
    color: #333;
    line-height: 1.4;
    font-weight: 700;

    span {
      padding: 0em 1em !important;
    }
  }

  .name-box {
    padding: 0.5em 1em !important;
    display: flex;
    align-items: center;
    height: 56px;

    .name {
      flex-grow: 1;
    }

    .audio {
      flex-shrink: 0;
      width: 40px;

      i {
        font-size: 40px;
      }
    }
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
  padding-top: 30px;
  display: flex;
  justify-content: space-between;
}

#game-box {
  display: flex;
  max-width: 1300px;
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
  display: flex;
  flex-direction: column;
}

#game {
  width: 100%;
  text-transform: none;
  background-color: white;
  font-family: $whiteBoxFont;
  color: #333;
  padding: 0 1rem !important;
  line-height: 1.4;
  font-size: 3em;
  padding-right: 100px;
  display: flex;
  align-items: center;
}

#game-info-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 100px;
}

#goal {
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
  max-height: 185px;
}

#round {
  text-align: right;
  font-size: 3em;
  text-transform: uppercase;
  font-weight: 300;
  line-height: 1.2;

  span {
    padding-right: 15px;
  }
}

#timer {
  text-align: right;
  font-size: 4em;
  line-height: 0.9;
  font-weight: 700;

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
