<template>
  <div class="playerinfo-box" :class="side">
    <div class="player-name">
      <div class="pronouns">
        <swipe :visible="visible" :dir="otherSide" :delay="0.3">
          <span>{{ player.pronouns }}</span>
        </swipe>
      </div>

      <swipe dir="down" :visible="visible" :delay="0.2">
        <div class="name-box dungeon-box">
          <Flag :code="player.flag" />

          <div class="name">
            <fit-text :max="2.5">
              {{ player.name }}
            </fit-text>
          </div>

          <div class="audio">
            <v-icon v-if="player.volume > 0"> mdi-volume-high </v-icon>
          </div>
        </div>
      </swipe>
    </div>

    <div class="done-holder">
      <div class="done-slider" :class="{ on: player.raceState != 'none' }">
        <div class="left" :class="player.raceState" v-if="player.raceState == 'winner'">
          1<span class="small">st</span>
        </div>

        <div class="left" :class="player.raceState" v-if="player.raceState == 'loser'">
          2<span class="small">nd</span>
        </div>

        <div class="left" :class="player.raceState" v-if="player.raceState == 'forfeit'">FF</div>

        <div class="left" :class="player.raceState" v-if="player.raceState == 'none'"></div>

        <div class="right">{{ player.finalTime }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$whiteBoxFont: 'Arvo', serif;
.playerinfo-box {
  display: flex;
  gap: 15px;
}

.player-name {
  width: 575px;
  line-height: 1;
  .pronouns {
    text-transform: none;
    font-family: $whiteBoxFont;
    color: white;
    line-height: 1.4;
    font-weight: 700;
    text-shadow:
      0px 0px 3px black,
      0px 0px 3px black,
      0px 0px 3px black;
    background-image: url('../../dist/img/mt19_rope.png');
    background-repeat: repeat-x;
    background-size: auto 100%;
    transform: translateY(3px);
    border-radius: 8px;
    position: relative;
    z-index: 10;

    span {
      padding: 0em 1em !important;
    }
  }

  .name-box {
    background-image: url('../../dist/img/mt19_nameback.jpg');
    background-repeat: repeat-x;
    background-size: auto 100%;
    display: flex;
    align-items: center;
    height: 56px;
    border-radius: 8px;

    .flag {
      height: 100%;
    }

    .name {
      padding: 0.6em 1em;
      transform: translateY(2px);
      flex-grow: 1;
      font-family: 'DRAGON HUNTER', serif;
      letter-spacing: 0.3em;
    }

    .audio {
      margin-right: 10px;
      flex-shrink: 0;
      width: 40px;

      i {
        font-size: 2.5em;
      }
    }
  }
}

.done-holder {
  display: flex;
  overflow: hidden;
}

.playerinfo-box .done-holder .done-slider {
  display: flex;
  font-size: 3em;
  color: #333;
  align-items: center;

  transform: translateX(-101%);

  transition: transform 0.5s;

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

.playerinfo-box.right {
  text-align: right;
  flex-direction: row-reverse;

  .name-box {
    flex-direction: row-reverse;
  }

  .done-slider {
    transform: translateX(101%);
    flex-direction: row-reverse;
    padding-left: 0px;
  }
}

.playerinfo-box.compact {
  font-size: 0.6em;
  .player-name {
    width: 400px;
  }

  .name-box {
    height: 30px;
  }

  .done-slider {
    .left {
      width: 50px;
    }

    .right {
      padding: 0 10px;
    }
  }
}
</style>

<script>
export default {
  props: {
    player: Object,
    visible: Boolean,
    side: String,
  },

  computed: {
    otherSide() {
      return this.side == 'left' ? 'right' : 'left';
    },
  },
};
</script>
