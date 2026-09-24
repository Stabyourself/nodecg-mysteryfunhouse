<template>
  <v-app>
    <div id="section-wrapper">
      <div class="info-holder">
        <img class="logo" :src="currentEventLogo.url" style="height: 147px"/>
        <mt20-game-timer-box-vertical :game="game" :goal="goal" :submitter="submitter" :visible="visible" :boxart="currentBoxart" :timer="timerText" :platform="platform" />
      </div>

      <div id="main-section">
        <div class="main-row">
          <mt20-player-box-small :player="players[0]" :visible="visible" side="left" :race-state="players[0].raceState" :time="players[0].finalTime" />
          <div class="round">{{ round1 }}</div>
          <mt20-player-box-small :player="players[1]" :visible="visible" side="right" :race-state="players[1].raceState" :time="players[1].finalTime" />
        </div>

        <div class="main-row">
          <obs-video :player="players[0].number" :width="656" :height="492"></obs-video>

          <obs-video :player="players[1].number" :width="656" :height="492"></obs-video>
        </div>

        <div class="spacer"></div>

        <div class="main-row">
          <obs-video :player="players[2].number" :width="656" :height="492"></obs-video>

          <obs-video :player="players[3].number" :width="656" :height="492"></obs-video>
        </div>

        <div class="main-row">
          <mt20-player-box-small :player="players[2]" :visible="visible" side="left" :race-state="players[2].raceState" :time="players[2].finalTime" />
          <div class="round">{{ round2 }}</div>
          <mt20-player-box-small :player="players[3]" :visible="visible" side="right" :race-state="players[3].raceState" :time="players[3].finalTime" />
        </div>
      </div>
    </div>

    <AchievementManager></AchievementManager>
    <Telestrator v-if="showTelestrator"/>
  </v-app>
</template>

<style lang="scss" scoped>
#section-wrapper {
  width: 1920px;
  height: 1080px;
  position: relative;
}

#main-section {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  position: absolute;
  top: 0px;
  right: 0px;
  width: 1322px;
  height: 1080px;

  .spacer {
    flex-grow: 1;
  }
}

.main-row {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

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
  padding: 20px;
  position: relative;
  height: 100%;
  width: 598px;

  display: flex;
  flex-direction: column;
  gap: 50px;
  align-items: center;

  .timer {
    font-size: 4em;
    line-height: 0.9;
    font-weight: 700;
  }
}

.game-box-holder {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  padding: 20px;

  display: flex;
  align-items: center;
  justify-content: center;

  #game-box {
    width: 100%;
  }
}

.round {
  font-family: "Press Start 2P";
  font-size: 1rem;
  font-weight: 700;
}

.spacer {
  flex-grow: 1;
}
</style>

<script>
import { bindReplicant } from '../../util.js';
import { layoutMixin } from '../../layout.js';

export default {
  mixins: [layoutMixin(4)],

  created() {
    bindReplicant.call(this, 'round1', 'match1round');
    bindReplicant.call(this, 'round2', 'match2round');
  },

  data() {
    return {
      round1: '',
      round2: '',
    };
  },
};
</script>
