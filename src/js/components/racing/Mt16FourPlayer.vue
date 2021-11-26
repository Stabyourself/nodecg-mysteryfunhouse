<template>
  <v-app>
    <player-name
      :visible="visible"
      pronoun-h="40"
      name-h="95"
      style="top: -6px; right: 676px; width: 656px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <span class="pixel-font pixel-font-alt">
            {{ player0pronouns != "" ? `(${player0pronouns})` : "" }}
            {{ player0name }}
          </span>
        </swipe>
      </template>
    </player-name>

    <div
      style="position: absolute; top: 43px; right: 676px; width: 656px; height:492px"
    >
      <twitch-player
        :opacity="player0streamHidden ? 0 : 1"
        :playerNumber="0"
        :url="player0twitch"
        :quality="player0quality ? player0quality : 'auto'"
        :volume="player0streamHidden ? 0 : player0volume"
        :crop="player0crop"
        :width="656"
        :height="492"
      ></twitch-player>
    </div>

    <player-name
      :visible="visible"
      class="right"
      pronoun-h="40"
      name-h="95"
      style="top: -6px; right: 10px; width: 656px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <span class="pixel-font pixel-font-alt">
            {{ player1name }}
            {{ player1pronouns != "" ? `(${player1pronouns})` : "" }}
          </span>
        </swipe>
      </template>
    </player-name>

    <div
      style="position: absolute; top: 43px; right: 10px; width: 656px; height:492px"
    >
      <twitch-player
        :opacity="player1streamHidden ? 0 : 1"
        :playerNumber="1"
        :url="player1twitch"
        :quality="player1quality ? player1quality : 'auto'"
        :volume="player1streamHidden ? 0 : player1volume"
        :crop="player1crop"
        :width="656"
        :height="492"
      ></twitch-player>
    </div>

    <player-name
      :visible="visible"
      pronoun-h="40"
      name-h="95"
      style="top: 1031px; right: 676px; width: 656px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="down" :delay="0.5">
          <span class="pixel-font pixel-font-alt">
            {{ player2pronouns != "" ? `(${player2pronouns})` : "" }}
            {{ player2name }}
          </span>
        </swipe>
      </template>
    </player-name>

    <div
      style="position: absolute; top: 545px; right: 676px; width: 656px; height:492px"
    >
      <twitch-player
        :opacity="player2streamHidden ? 0 : 1"
        :playerNumber="2"
        :url="player2twitch"
        :quality="player2quality ? player2quality : 'auto'"
        :volume="player2streamHidden ? 0 : player2volume"
        :crop="player2crop"
        :width="656"
        :height="492"
      ></twitch-player>
    </div>

    <player-name
      :visible="visible"
      class="right"
      pronoun-h="40"
      name-h="95"
      style="top: 1031px; right: 10px; width: 656px; height: 135px"
    >
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="down" :delay="0.5">
          <span class="pixel-font pixel-font-alt">
            {{ player3name }}
            {{ player3pronouns != "" ? `(${player3pronouns})` : "" }}
          </span>
        </swipe>
      </template>
    </player-name>

    <div
      style="position: absolute; top: 0px; right: 0px; width: 1322px"
      class="round pixel-font pixel-font-alt"
    >
      {{ round1 }}
    </div>

    <div
      style="position: absolute; top: 1037px; left: 588px; width: 1322px"
      class="round pixel-font pixel-font-alt"
    >
      {{ round2 }}
    </div>

    <div
      style="position: absolute; top: 545px; right: 10px; width: 656px; height:492px"
    >
      <twitch-player
        :opacity="player3streamHidden ? 0 : 1"
        :playerNumber="3"
        :url="player3twitch"
        :quality="player3quality ? player3quality : 'auto'"
        :volume="player3streamHidden ? 0 : player3volume"
        :crop="player3crop"
        :width="656"
        :height="492"
      ></twitch-player>
    </div>

    <div class="info-holder">
      <swipe :visible="visible" dir="right">
        <div class="logo pixel-font pixel-font-alt">
          MT16<span class="logo-small">bit</span>
        </div>
      </swipe>

      <swipe
        :visible="visible"
        :delay="0.2"
        dir="right"
        class="boxart"
        style="margin-top: 80px;"
        v-if="currentBoxart"
      >
        <img :src="currentBoxart.url" />
      </swipe>

      <swipe :visible="visible" :delay="0.4" dir="right" class="game">
        <fit-text :max="1" :min="0.1">
          <span class="pixel-font pixel-font-alt">{{ game }}</span>
        </fit-text>
      </swipe>
      <swipe :visible="visible" dir="right" :delay="0.6" class="goal">
        <fit-text :max="1" :min="0.1">
          <span class="pixel-font pixel-font-alt">{{ goal }}</span>
        </fit-text>
      </swipe>

      <timer
        style="margin-top: 80px;"
        :class="{ active: timer.state == 'playing' }"
      >
        <swipe dir="right" :visible="visible" :delay="0.8">
          {{ timerText }}
        </swipe>
      </timer>

      <rainwave v-if="showRainwave" style="bottom: 0px; right: 10px;">
      </rainwave>
    </div>
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

.info-holder {
  font-size: 3rem;
  line-height: 1;
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 588px;
  text-align: center;
}

.round {
  font-size: 3rem;
  text-align: center;
  margin-top: -4px;
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

    bindReplicant.call(this, "round1", "match1round");
    bindReplicant.call(this, "round2", "match2round");

    for (let i = 0; i < 4; i++) {
      bindReplicant.call(this, `player${i}name`);
      bindReplicant.call(this, `player${i}pronouns`);

      bindReplicant.call(this, `player${i}twitch`);
      // bindReplicant.call(this, `player${i}quality`)
      bindReplicant.call(this, `player${i}volume`);
      bindReplicant.call(this, `player${i}streamHidden`);

      bindReplicant.call(this, `player${i}done`);
      bindReplicant.call(this, `player${i}forfeit`);
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
        if (scene.name == "4 Player") {
          this.visible = true;
        }
      });

      window.addEventListener("obsSceneChanged", (event) => {
        console.log("Switched to scene " + event.detail.name);
        if (event.detail.name == "4 Player") {
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

      document.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          this.visible = !this.visible;
        }
      });
    }
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

      round1: "",
      round2: "",

      player0name: "",
      player0pronouns: "",

      player0twitch: "",
      player0quality: null,
      player0volume: 0,
      player0streamHidden: false,

      player0done: false,
      player0forfeit: false,
      player0finalTime: false,

      player0crop: [0, 0, 0, 0],

      player1name: "",
      player1pronouns: "",

      player1twitch: "",
      player1quality: null,
      player1volume: 0,
      player1streamHidden: false,

      player1done: false,
      player1forfeit: false,
      player1finalTime: false,

      player1crop: [0, 0, 0, 0],

      player2name: "",
      player2pronouns: "",

      player2twitch: "",
      player2quality: null,
      player2volume: 0,
      player2streamHidden: false,

      player2done: false,
      player2forfeit: false,
      player2finalTime: false,

      player2crop: [0, 0, 0, 0],

      player3name: "",
      player3pronouns: "",

      player3twitch: "",
      player3quality: null,
      player3volume: 0,
      player3streamHidden: false,

      player3done: false,
      player3forfeit: false,
      player3finalTime: false,

      player3crop: [0, 0, 0, 0],

      timer: {
        ms: 0,
      },

      showRainwave: false,

      visible: false,
    };
  },
};
</script>
