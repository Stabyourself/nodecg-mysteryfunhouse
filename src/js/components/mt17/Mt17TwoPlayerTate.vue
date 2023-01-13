<template>
  <v-app>
    <div style="top: -2px; left: 588px; width: 555px; position: absolute">
      <fit-text
        :max="1.6"
        class="label-font name"
        style="float: left; background: #147412"
      >
        {{
          player0pronouns != "" && player0pronouns ? `(${player0pronouns})` : ""
        }}
        {{ player0name }}
      </fit-text>
    </div>

    <div
      style="
        position: absolute;
        top: 62px;
        left: 607px;
        width: 590px;
        height: 960px;
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
        :width="590"
        :height="960"
      ></twitch-player>
    </div>

    <player-done-slider
      style="top: 43px; right: 676px; width: 656px"
      :state="player0raceState"
      :finalTime="player0finalTime"
      background
    >
    </player-done-slider>

    <div style="top: -2px; right: 20px; width: 555px; position: absolute">
      <fit-text
        :max="1.5"
        class="label-font name"
        style="float: right; background: #147412"
        >{{ player1name }}
        {{
          player1pronouns != "" && player1pronouns ? `(${player1pronouns})` : ""
        }}
      </fit-text>
    </div>

    <div
      style="
        position: absolute;
        top: 62px;
        left: 1285px;
        width: 590px;
        height: 960px;
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
        :width="590"
        :height="960"
      ></twitch-player>
    </div>

    <player-done-slider
      style="top: 43px; right: 10px; width: 656px"
      :state="player1raceState"
      :finalTime="player1finalTime"
      background
    >
    </player-done-slider>

    <div
      style="position: absolute; top: 0px; right: 10px; width: 1340px"
      class="round d-flex justify-center"
    >
      <div class="label-font">
        {{ round1 }}
      </div>
    </div>

    <!-- audio 0-->
    <mt17-audio v-if="player0volume > 0" :x="545" :y="40" :size="60" />

    <!-- audio 1-->
    <mt17-audio v-if="player1volume > 0" :x="1880" :y="40" :size="50" />

    <div class="info-holder">
      <div class="match-round">
        <div class="match-round-inner">
          <img class="logo" :src="currentEventLogo.url" />
        </div>
      </div>

      <div class="boxart mb-3" style="margin-top: 40px" v-if="currentBoxart">
        <img :src="currentBoxart.url" />
      </div>

      <div class="game">
        <fit-text :max="1" :min="0.1">
          <span class="lcd-font">
            {{ game }}
            <span v-if="!!platform"> ({{ platform }}) </span>
          </span>
        </fit-text>
      </div>
      <div class="goal">
        <fit-text :max="1" :min="0.1">
          <span class="lcd-font">{{ goal }}</span>
        </fit-text>
        <div>
          <fit-text :max="1" :min="0.1">
            <span class="lcd-font submitter" v-if="!!submitter">
              Subbed by {{ submitter }}</span
            >
          </fit-text>
        </div>
      </div>

      <mt17-timer
        style="margin-top: 50px"
        :class="{ active: timer.state == 'playing' }"
      >
        <span class="lcd-font">
          {{ timerText }}
        </span>
      </mt17-timer>
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

.name {
  padding: 0 2px;
}

.player-name {
  font-size: 1.6rem;
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

.info-holder {
  font-size: 3rem;
  line-height: 1;
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 577px;
  text-align: center;
  padding: 47px;
}

.submitter {
  font-size: 0.7em;
}

.round {
  text-align: center;

  div {
    font-size: 1.6rem;
  }
}

.match-round {
  position: relative;
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
    padding: 10px 40px;
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

    for (let i = 0; i < 2; i++) {
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

      timer: {
        ms: 0,
      },

      visible: false,
    };
  },
};
</script>
