<template>
  <div class="player-box megaman-box" :class="side">
    <div class="player-name">
      {{  player.name.toUpperCase() }}
    </div>
    <div class="player-info">
      <div class="player-pronouns" v-if="player.pronouns">{{ player.pronouns }}</div>
      <div class="player-flag">
          <Flag :code="player.flag" /></div>
      <div class="player-health" :class="raceState">
        <div class="health-bar" :style="{ width: health*100 + '%' }"></div>
        <div class="health-text" v-if="raceState != 'none'">{{ timeAdjusted }}</div>
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
    margin: 20px
  }

  .player-name {
    font-size: 4em;
    color: white;
    margin-bottom: -10px;
    text-shadow: 5px 5px 0 #146acb, -5px 5px 0 #146acb, 5px -5px 0 #146acb, -5px -5px 0 #146acb, 0px 5px 0 #146acb, 5px 0px 0 #146acb, 0px -5px 0 #146acb, -5px 0px 0 #146acb;
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

      $green: #3bd62f;
      $red: #d21515;

      .health-text {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;

        padding-top: 4px;
        font-family: "Press Start 2P";

        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.5em;
        color: $green;
        text-shadow: 2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black, 0px 2px 0 black, 2px 0px 0 black, 0px -2px 0 black, -2px 0px 0 black;
      }

      &.loser .health-text, &.forfeit .health-text {
        color: $red;
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

    timeAdjusted() {
      if (this.raceState == 'forfeit') {
        return this.time + ' (FF)';
      } else {
        return this.time;
      }
    }
  },
};
</script>
