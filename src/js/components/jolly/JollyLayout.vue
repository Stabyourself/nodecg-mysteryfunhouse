<template>
  <v-app>
    <swipe :delay="0.5" :visible="visible" class="match-round" style="top: 10px">
      <img src="https://www.games2jolly.com/templates/joyfulgames/images/logo.png" />
    </swipe>

    <player-name
      :visible="visible"
      pronoun-h="40"
      name-h="95"
      style="top: 15px; left: 20px; width: 775px; height: 135px"
      class="player-name">
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <span class="jolly-font">{{ player0pronouns }}</span>
        </swipe>
      </template>
      <template v-slot:name>
        <swipe dir="up" :visible="visible">
          <fit-text :max="2.5" class="jolly-font">
            {{ player0name }}
          </fit-text>
        </swipe>
      </template>
    </player-name>

    <player-name
      :visible="visible"
      class="right"
      pronoun-h="40"
      name-h="95"
      style="top: 15px; right: 15px; width: 775px; height: 135px">
      <template v-slot:pronouns>
        <swipe :visible="visible" dir="up" :delay="0.5">
          <span class="jolly-font">
            {{ player1pronouns }}
          </span>
        </swipe>
      </template>
      <template v-slot:name>
        <swipe dir="up" :visible="visible">
          <fit-text :max="2.5" class="jolly-font">
            {{ player1name }}
          </fit-text>
        </swipe>
      </template>
    </player-name>

    <obs-video :player="players[0].number" :x="15" :y="150" :width="930" :height="698"></obs-video>

    <obs-video :player="players[1].number" :x="975" :y="150" :width="930" :height="698"></obs-video>

    <player-done-slider
      style="top: 848px; left: 15px; width: 930px"
      :state="player0raceState"
      :finalTime="player0finalTime">
    </player-done-slider>

    <player-done-slider
      style="top: 848px; left: 975px; width: 930px"
      :state="player1raceState"
      :finalTime="player1finalTime">
    </player-done-slider>

    <mt16-game-box style="top: 865px; left: 15px">
      <template v-slot:boxart>
        <swipe :visible="visible" dir="right" class="boxart" v-if="currentBoxart">
          <div class="d-flex align-center" style="height: 100%">
            <img :src="currentBoxart.url" />
          </div>
        </swipe>
      </template>

      <template v-slot:text>
        <swipe :visible="visible" dir="up" :delay="1" class="game">
          <fit-text :max="1" :min="0.1">
            <span class="jolly-font">
              {{ game }}
              <span v-if="!!platform"> ({{ platform }})</span>
            </span>
          </fit-text>
        </swipe>
        <swipe :visible="visible" dir="up" :delay="0.8" class="goal">
          <fit-text :max="1" :min="0.1">
            <span class="jolly-font">
              {{ goal }}
              <span v-if="!!submitter"> - Subbed by {{ submitter }}</span>
            </span>
          </fit-text>
        </swipe>
        <!-- <div class="submitter">Submitted by {{ submitter }}</div> -->
      </template>
    </mt16-game-box>

    <mt16-timer style="top: 848px" :class="{ active: timer.state == 'playing' }">
      <swipe dir="down" :visible="visible">
        {{ timerText }}
      </swipe>
    </mt16-timer>

    <Telestrator v-if="showTelestrator"/>
  </v-app>
</template>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@900&display=swap');

.jolly-font {
  text-transform: uppercase;
  font-family: 'Inknut Antiqua', serif;

  background: #920232;
  background: linear-gradient(to top, #f67a01 0%, #fadc00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;

  filter: drop-shadow(0px 4px #920232);
}

.player-name {
  overflow: hidden;

  img {
    margin-left: 0.3em;
    margin-right: 0.3em;

    height: 0.8em;
    vertical-align: text-top;
  }
}

.match-round img {
  display: block;
  margin: 0 auto;
  max-height: 135px;
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
</style>

<script>
import { layoutMixin } from '../../layout.js';

export default {
  mixins: [layoutMixin(2)],
};
</script>
