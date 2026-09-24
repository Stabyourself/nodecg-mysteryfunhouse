<template>
  <v-app>
    <div class="twoplayers">
    <div id="top-section">
      <mt20-player-box :player="players[0]" :visible="visible" side="left" :health="health[0]" :time="players[0].finalTime" :race-state="players[0].raceState" />
      <img class="logo" :src="currentEventLogo.url" style="height: 147px"/>
      <mt20-player-box :player="players[1]" :visible="visible" side="right" :health="health[1]" :time="players[1].finalTime" :race-state="players[1].raceState" />
    </div>

    <div id="player-section">
      <obs-video :player="players[0].number" :width="930" :height="698"></obs-video>

      <obs-video :player="players[1].number" :width="930" :height="698"></obs-video>
    </div>

    <div id="bottom-section">
      <mt20-game-timer-box :game="game" :goal="goal" :submitter="submitter" :visible="visible" :boxart="currentBoxart" :timer="timerText" :round="round" :platform="platform" />
    </div>


    <Telestrator v-if="showTelestrator"/>
  </div>
  </v-app>
</template>

<style lang="scss" scoped>
$whiteBoxFont: 'Arvo', serif;

#app {
  width: 1920px;
  height: 1080px;
  position: relative;
}

.twoplayers {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  gap: 15px;
}

#top-section {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

#player-section {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

#bottom-section {
  max-width: 1400px;
}
</style>

<script>
import { bindReplicant } from '../../util.js';
import { layoutMixin } from '../../layout.js';

export default {
  mixins: [layoutMixin(2)],

  created() {
    bindReplicant.call(this, 'round', `match${1 + this.playerOffset / 2}round`);
  },

  computed: {
    // half a heart gone in losers, and half when the other player wins or you forfeit
    health() {
      return this.players.map((player, i) => {
        if (this.timer.ms == 0) return 0;

        const opponent = this.players[1 - i];
        let hp = this.round.toLowerCase().includes('loser') ? 0.5 : 1;

        if (opponent.raceState == 'winner' || player.raceState == 'forfeit') {
          hp -= 0.5;
        }

        return hp;
      });
    },
  },

  data() {
    return {
      round: '',
    };
  },
};
</script>
