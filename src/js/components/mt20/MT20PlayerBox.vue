<template>
  <div class="player-box megaman-box" :class="side">
    <div class="player-name">
      {{  player.name.toUpperCase() }}
      <div class="audio" v-if="player.volume > 0">
        <img src="/bundles/nodecg-mysteryfunhouse/dist/img/mt20/audio.png" />
      </div>
    </div>
    <div class="player-info">
      <div class="player-pronouns" v-if="player.pronouns">{{ player.pronouns }}</div>
      <div class="player-flag">
          <Flag :code="player.flag" /></div>
      <div class="player-health" :class="raceState">
        <div class="health-bar" :style="{ width: health*100 + '%' }"></div>
      </div>
    </div>

    <div class="player-done-wrap">
      <div class="player-done megaman-box-small" :class="raceState">
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
  .player-box {
    font-family: "Pixellari";
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 700px;
    line-height: 1.2;
    background: #000b2e;
    margin: 20px;
    position: relative;
  }

  .player-name {
    font-size: 4em;
    color: white;
    margin-bottom: -10px;
    text-shadow: 5px 5px 0 #146acb, -5px 5px 0 #146acb, 5px -5px 0 #146acb, -5px -5px 0 #146acb, 0px 5px 0 #146acb, 5px 0px 0 #146acb, 0px -5px 0 #146acb, -5px 0px 0 #146acb;
    display: flex;
    gap: 10px;
  }

  .audio {
    img {
      height: 60px;
      padding-top: 5px;

    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;

    }
  }

  .player-info {
    display: flex;
    flex-direction: row;
    align-items: center;

    height: 40px;
    gap: 15px;

    .player-pronouns {
      background: #146acb;
      color: black;
      font-size: 1.5em;
      padding-left: 0.5em;
      padding-right: 0.5em;
      padding-top: 4px;
      border: 5px solid black;
      height: 40px;
    }

    .player-flag {
      .flag {
        height: 100%;
      }
      height: 100%;
      // border: 5px solid black;
    }

    .player-health {
      height: 100%;
      width: 355px;
      background: black;
      position: relative;

      .health-bar {
        width: 0%;
        height: 100%;
        background-image: url('../../dist/img/mt20/healthbar.png');
        background-size: auto 100%;
        background-position: left;
        background-repeat: repeat;
        image-rendering: pixelated;
        transition: width 1s linear;

        position: absolute;
        top: 0px;
        left: 0px;
        height: 100%;
      }

    }
  }

    $doneHeight: 60px;
    .player-done-wrap {
      position: absolute;
      bottom: -$doneHeight;
      height: $doneHeight;
      overflow: hidden;
      z-index: 1000;
    }

    .player-done {
      border-top-width: 0px;
      line-height: 1.3;
      background: #000b2e;
      font-size: 3em;
      color: white;
      height: $doneHeight;
      padding-right: 20px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      transform: translateY(0);
      transition: transform 0.3s;

      &.none {
        transform: translateY(-$doneHeight);
      }

      .left {
        color: white;
        background: green;
        padding: 0 0.1em;

        .small {
          font-size: 0.5em;
        }

        &.loser, &.forfeit {
          background: red;
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
    width: Number,
    health: Number,
    time: String,
    raceState: String,
  },

  computed: {
    otherSide() {
      return this.side == 'left' ? 'right' : 'left';
    },
  },
};
</script>
