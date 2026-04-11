<template>
  <div class="player-box megaman-box-small" :class="side">
    <div class="player-flag">
      <Flag :code="player.flag" />
    </div>

    <div class="player-name">
      {{  player.name.toUpperCase() }}
    </div>

    <div class="player-pronouns" v-if="player.pronouns">{{ player.pronouns }}</div>

    <div v-if="raceState !='none'" style="flex-grow: 1"></div>

    <div v-if="raceState !='none'" class="timer-text" :class="raceState">{{ timeAdjusted }}</div>
  </div>
</template>

<style lang="scss" scoped>
  .player-box {
    font-family: "Pixellari";
    display: flex;
    align-items: center;
    line-height: 1.2;
    background: #000b2e;
    height: 45px;
    gap: 10px;
    width: 550px;
  }

  .player-name {
    font-size: 2em;
    color: white;
    padding-top: 4px;

    // text-shadow: 5px 5px 0 #146acb, -5px 5px 0 #146acb, 5px -5px 0 #146acb, -5px -5px 0 #146acb, 0px 5px 0 #146acb, 5px 0px 0 #146acb, 0px -5px 0 #146acb, -5px 0px 0 #146acb;
  }


  .player-pronouns {
    background: #146acb;
    color: black;
    font-size: 1em;
    padding-left: 0.5em;
    padding-right: 0.5em;
    padding-top: 4px;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .player-flag {
    .flag {
      height: 100%;
    }
    height: 100%;
    // border: 5px solid black;
  }

  $green: #3bd62f;
  $red: #d21515;

  .timer-text {
    margin-right: 4px;
    padding-top: 4px;
    font-family: "Press Start 2P";

    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1em;
    color: $green;
    text-shadow: 2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black, 0px 2px 0 black, 2px 0px 0 black, 0px -2px 0 black, -2px 0px 0 black;

    &.loser, &.forfeit {
      color: $red;
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
      console.log(this.time)
      if (this.raceState == 'forfeit') {
        return this.time + ' (FF)';
      } else {
        return this.time;
      }
    }
  },
};
</script>
