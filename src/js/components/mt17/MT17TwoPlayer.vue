<template>
  <v-app>
    <!-- round -->
    <div class="flex-center">
      <div class="label-font">{{ round }}</div>
    </div>

    <!-- mt17 -->

    <div class="flex-center" style="position: absolute; top: 794px">
      <div class="label-font" style="font-size: 42px; transform: rotate(-2deg)">
        MT0017
      </div>
    </div>

    <!-- players -->

    <div style="position: absolute; top: 0px; left: 0px; right: 900px">
      <div class="flex-center">
        <div
          class="label-font"
          style="transform: rotate(0.5deg); background-color: #2e2c94"
        >
          {{ player0name }}
          <span v-if="player0pronouns">({{ player0pronouns }})</span>
        </div>
      </div>
    </div>

    <!-- audio 0-->
    <mt17-audio v-if="player0volume > 0" :x="40" :y="-10" />

    <div style="position: absolute; top: 0px; left: 1020px; right: 0px">
      <div class="flex-center">
        <div
          class="label-font"
          style="transform: rotate(-0.5deg); background-color: #147412"
        >
          {{ player1name }}
          <span v-if="player1pronouns">({{ player1pronouns }})</span>
        </div>
      </div>
    </div>

    <!-- audio 1-->
    <mt17-audio v-if="player1volume > 0" :x="1780" :y="-10" />

    <div
      style="
        position: absolute;
        top: 94px;
        left: 94px;
        width: 862px;
        height: 646px;
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
        :width="861"
        :height="641"
      ></twitch-player>
    </div>

    <div
      style="
        position: absolute;
        top: 94px;
        right: 94px;
        width: 862px;
        height: 646px;
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
        :width="861"
        :height="641"
      ></twitch-player>
    </div>

    <mt17-game-box style="top: 877px; left: 100px">
      <template v-slot:boxart>
        <div class="d-flex align-center" style="height: 100%">
          <img :src="currentBoxart.url" />
        </div>
      </template>

      <template v-slot:text>
        <div style="margin-bottom: -6px">
          <div>
            <fit-text :max="0.8" :min="0.1">
              <span class="lcd-font">
                {{ game }}
                <span v-if="!!platform"> ({{ platform }})</span>
              </span>
            </fit-text>
          </div>
          <div>
            <fit-text :max="0.8" :min="0.1">
              <span class="lcd-font">
                {{ goal }}
                <span v-if="!!submitter"> - Subbed by {{ submitter }}</span>
              </span>
            </fit-text>
          </div>
        </div>
        <!-- <div class="submitter">Submitted by {{ submitter }}</div> -->
      </template>
    </mt17-game-box>

    <mt17-player-done-slider
      style="top: 860px; left: 15px; width: 930px"
      :state="player0raceState"
      :finalTime="player0finalTime"
    >
    </mt17-player-done-slider>

    <mt17-player-done-slider
      style="top: 860px; left: 975px; width: 930px"
      :state="player1raceState"
      :finalTime="player1finalTime"
    >
    </mt17-player-done-slider>

    <!-- <rainwave
            v-if="showRainwave"
            style="top: 975px; left: 1521px; width: 444px; height: 124px">
        </rainwave> -->

    <mt17-timer
      style="top: 848px"
      :class="{ active: timer.state == 'playing' }"
    >
      <span class="lcd-font">
        {{ timerText }}
      </span>
    </mt17-timer>

    <AchievementManager></AchievementManager>
    <Telestrator></Telestrator>
  </v-app>
</template>

<style lang="scss" scoped>
.player-name {
  img {
    margin-left: 0.3em;
    margin-right: 0.3em;

    height: 0.8em;
    vertical-align: text-top;
  }
}

.boxart {
  margin-right: 15px;
  height: 100%;

  img {
    display: block;
    margin: 0 auto;
    max-height: 100%;
    max-width: 325px;
  }
}

.round {
  margin-top: -30px;
}

.match-round {
  width: 100%;
  height: 150px;
  display: flex;
  justify-content: center;

  .logo {
    width: 100%;
    height: 117px;
    object-fit: contain;
  }

  .match-round-inner {
    width: 340px;
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

    bindReplicant.call(this, "showRainwave");

    bindReplicant.call(this, "currentEventLogo");
    bindReplicant.call(this, "round", "match1round");

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

    if (
      window.obsstudio &&
      window.obsstudio.getControlLevel &&
      window.obsstudio.getControlLevel != 0
    ) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log("Start scene: " + scene.name);
        if (scene.name == "2 Player") {
          this.visible = true;
        }
      });

      window.addEventListener("obsSceneChanged", (event) => {
        console.log("Switched to scene " + event.detail.name);
        if (event.detail.name == "2 Player") {
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
      round: "",

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

      showRainwave: false,

      visible: false,
    };
  },
};
</script>
