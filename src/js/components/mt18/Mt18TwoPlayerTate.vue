<template>
  <v-app>
    <player-name
      :visible="visible"
      pronoun-h="40"
      name-h="95"
      style="top: -2px; left: 588px; width: 555px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <fit-text :max="1.5" class="pixel-font name">
            {{ player0pronouns != "" ? `(${player0pronouns})` : "" }}
            {{ player0name
            }}<img
              v-if="player0volume > 0"
              :src="'/bundles/nodecg-mysteryfunhouse/dist/img/audio.png'"
            />
          </fit-text>
        </swipe>
      </template>
    </player-name>

    <div
      style="
        position: absolute;
        top: 48px;
        right: 676px;
        width: 656px;
        height: 984px;
      "
    >
      <twitch-player
        :opacity="player0streamHidden ? 0 : 1"
        :playerNumber="0"
        :url="player0twitch"
        :quality="player0quality ? player0quality : 'auto'"
        :volume="player0streamHidden || !visible ? 0 : player0volume"
        :crop="player0crop"
        :aspectratio="player0aspectratio"
        :width="656"
        :height="984"
      ></twitch-player>
    </div>

    <player-done-slider
      style="top: 48px; right: 676px; width: 656px"
      :state="player0raceState"
      :finalTime="player0finalTime"
      background
    >
    </player-done-slider>

    <player-name
      :visible="visible"
      class="right"
      pronoun-h="40"
      name-h="95"
      style="top: -2px; right: 10px; width: 555px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <fit-text :max="1.5" class="pixel-font name">
            <img
              v-if="player1volume > 0"
              :src="'/bundles/nodecg-mysteryfunhouse/dist/img/audio.png'"
            />{{ player1name }}
            {{ player1pronouns != "" ? `(${player1pronouns})` : "" }}
          </fit-text>
        </swipe>
      </template>
    </player-name>

    <div
      style="
        position: absolute;
        top: 48px;
        right: 10px;
        width: 656px;
        height: 984px;
      "
    >
      <twitch-player
        :opacity="player1streamHidden ? 0 : 1"
        :playerNumber="1"
        :url="player1twitch"
        :quality="player1quality ? player1quality : 'auto'"
        :volume="player1streamHidden || !visible ? 0 : player1volume"
        :crop="player1crop"
        :aspectratio="player1aspectratio"
        :width="656"
        :height="984"
      ></twitch-player>
    </div>

    <player-done-slider
      style="top: 48px; right: 10px; width: 656px"
      :state="player1raceState"
      :finalTime="player1finalTime"
      background
    >
    </player-done-slider>

    <div
      style="position: absolute; top: 0px; right: 10px; width: 1322px"
      class="round pixel-font"
    >
      {{ round1 }}
    </div>

    <div class="info-holder">
      <swipe :visible="visible" dir="right" style="height: 200px">
        <div class="match-round">
          <div class="match-round-inner">
            <img class="logo" :src="currentEventLogo.url" />
          </div>
        </div>
      </swipe>

      <swipe
        :visible="visible"
        :delay="0.2"
        dir="right"
        class="boxart mb-3"
        style="margin-top: 80px"
        v-if="currentBoxart"
      >
        <img :src="currentBoxart.url" />
      </swipe>

      <swipe :visible="visible" :delay="0.4" dir="right" class="game">
        <fit-text :max="1" :min="0.1">
          <span class="pixel-font">
            {{ game }}
            <span v-if="!!platform"> ({{ platform }}) </span>
          </span>
        </fit-text>
      </swipe>
      <swipe :visible="visible" :delay="0.6" dir="right" class="goal">
        <fit-text :max="1" :min="0.1">
          <span class="pixel-font">{{ goal }}</span>
        </fit-text>
        <div>
          <fit-text :max="1" :min="0.1">
            <span class="pixel-font submitter" v-if="!!submitter">
              Subbed by {{ submitter }}</span
            >
          </fit-text>
        </div>
      </swipe>

      <mt16-timer
        style="margin-top: 80px"
        :class="{ active: timer.state == 'playing' }"
      >
        <swipe dir="right" :visible="visible" :delay="0.8">
          {{ timerText }}
        </swipe>
      </mt16-timer>
    </div>

    <AchievementManager></AchievementManager>
  </v-app>
</template>

<style lang="scss" scoped>
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

.player-name {
  .name {
    font-size: 1.5em;
    margin-top: -4px;
  }

  img {
    margin-left: 0.3em;
    margin-right: 0.3em;

    height: 0.8em;
    vertical-align: text-top;
  }
}

.info-holder {
  font-size: 3rem;
  line-height: 1;
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 588px;
  text-align: center;
  padding: 20px;
}

.submitter {
  font-size: 0.7em;
}

.round {
  font-size: 2rem;
  text-align: center;
  margin-top: 4px;
}

.match-round {
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;

  .logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .match-round-inner {
    width: 500px;
    height: 100%;
  }
}
</style>

<script>
import { bindReplicant, formatTimer } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "game");
    bindReplicant.call(this, "goal");
    bindReplicant.call(this, "platform");
    bindReplicant.call(this, "submitter");
    bindReplicant.call(this, "currentBoxart");

    bindReplicant.call(this, "timer");

    bindReplicant.call(this, "currentEventLogo");
    bindReplicant.call(this, "round1", "match1round");
    bindReplicant.call(this, "round2", "match2round");

    for (let i = 0; i < 4; i++) {
      bindReplicant.call(this, `player${i}name`);
      bindReplicant.call(this, `player${i}pronouns`);

      bindReplicant.call(this, `player${i}twitch`);
      // bindReplicant.call(this, `player${i}quality`)
      bindReplicant.call(this, `player${i}volume`);
      bindReplicant.call(this, `player${i}streamHidden`);

      bindReplicant.call(this, `player${i}raceState`);
      bindReplicant.call(this, `player${i}finalTime`);

      bindReplicant.call(this, `player${i}crop`);
      bindReplicant.call(this, `player${i}aspectratio`);
    }

    if (
      window.obsstudio &&
      window.obsstudio.getControlLevel &&
      window.obsstudio.getControlLevel != 0
    ) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log("Start scene: " + scene.name);
        if (scene.name == "2 Player Tate") {
          this.visible = true;
        }
      });

      window.addEventListener("obsSceneChanged", (event) => {
        console.log("Switched to scene " + event.detail.name);
        if (event.detail.name == "2 Player Tate") {
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

    document.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        this.visible = !this.visible;
      }
    });

    let vue = this;
    nodecg.listenFor("playSound", vue.playSound);
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
      game: "",
      goal: "",
      platform: "",
      submitter: "",
      currentBoxart: "",

      currentEventLogo: {},
      round1: "",
      round2: "",

      player0name: "",
      player0pronouns: "",

      player0twitch: "",
      player0quality: null,
      player0volume: 0,
      player0streamHidden: false,

      player0raceState: "none",
      player0finalTime: "",

      player0crop: [0, 0, 0, 0],
      player0aspectratio: false,

      player1name: "",
      player1pronouns: "",

      player1twitch: "",
      player1quality: null,
      player1volume: 0,
      player1streamHidden: false,

      player1raceState: "none",
      player1finalTime: "",

      player1crop: [0, 0, 0, 0],
      player1aspectratio: false,

      player2name: "",
      player2pronouns: "",

      player2twitch: "",
      player2quality: null,
      player2volume: 0,
      player2streamHidden: false,

      player2raceState: "none",
      player2finalTime: "",

      player2crop: [0, 0, 0, 0],
      player2aspectratio: false,

      player3name: "",
      player3pronouns: "",

      player3twitch: "",
      player3quality: null,
      player3volume: 0,
      player3streamHidden: false,

      player3raceState: "none",
      player3finalTime: "",

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
