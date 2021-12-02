<template>
  <v-app>
    <div class="logo-container">
      <swipe :visible="visible" class="match-round" style="top: 10px">
        <div class="logo pixel-font pixel-font-alt">
          MT16<span class="logo-small">bit</span>
        </div>
      </swipe>
    </div>

    <div class="matches">
      <div
        v-for="(match, i) in slicedSchedule"
        :key="match.match"
        class="match"
      >
        <swipe :delay="i * 0.5 + 1" :visible="visible" dir="up">
          <div class="d-flex top">
            <div class="left">
              {{ getRelativeTime(match.time) }}
            </div>
            <div class="right">
              {{
                new Date(match.time).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                })
              }}
              EST
            </div>
          </div>

          <div class="d-flex bottom">
            <div class="left player pixel-font">{{ match.player1 }}</div>
            <div class="vs pixel-font pixel-font-alt">vs.</div>
            <div class="player pixel-font">{{ match.player2 }}</div>
          </div>
        </swipe>
      </div>
    </div>

    <rainwave
      v-if="showRainwave"
      style="top: 975px; left: 1521px; width: 444px; height: 124px"
    >
    </rainwave>
  </v-app>
</template>

<style scope lang="scss">
.logo-container {
  width: 100%;
  text-align: center;
  height: 100px;

  .logo {
    margin-top: -20px;
    font-size: 5em;

    .logo-small {
      font-size: 0.3em;
    }
  }
}

.matches {
  margin-top: 7em;
}

.match {
  margin: 0 13em;
  margin-bottom: 4rem;
  color: #f58038;
  font-size: 2em;

  .right {
    flex-grow: 1;
    text-align: right;
  }

  .top {
    color: white;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 5px 5px 0 0;
    padding: 0 10px;
    font-family: "Edit Undo BRK" !important;
    color: #eee;
  }

  .bottom {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 0 0 5px 5px;
    padding: 10px 30px;
    width: 100%;
    align-items: center;
    font-size: 2.5em;

    .player {
      font-weight: bold;
      flex-grow: 1;
      flex-shrink: 1;
      flex-basis: 0;

      &.left {
        text-align: right;
      }
    }

    .vs {
      font-size: 0.5em;
      margin: 0 10px;
    }
  }
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  methods: {
    getRelativeTime(datestring) {
      const now = new Date();
      const diff = new Date(datestring) - now;

      // get days, hours and minutes of difference
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let out = "In ";

      if (days > 0) {
        out += days + " day" + (days != 1 ? "s" : "");
      }

      if (days > 0 || hours > 0) {
        out += " " + hours + " hour" + (hours != 1 ? "s" : "");
      }

      out += " " + minutes + " minute" + (minutes != 1 ? "s" : "");

      return out;
    },
  },

  created() {
    bindReplicant.call(this, "schedule");
    bindReplicant.call(this, "showRainwave");

    if (
      window.obsstudio &&
      window.obsstudio.getControlLevel &&
      window.obsstudio.getControlLevel != 0
    ) {
      window.obsstudio.getCurrentScene((scene) => {
        console.log("Start scene: " + scene.name);
        if (scene.name == "Coming Up") {
          this.visible = true;
        }
      });

      window.addEventListener("obsSceneChanged", (event) => {
        console.log("Switched to scene " + event.detail.name);
        if (event.detail.name == "Coming Up") {
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

      document.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          this.visible = !this.visible;
        }
      });
    }
  },

  computed: {
    slicedSchedule() {
      return this.schedule.slice(0, 4);
    },
  },

  data() {
    return {
      schedule: [],
      visible: false,
      showRainwave: false,
    };
  },
};
</script>
