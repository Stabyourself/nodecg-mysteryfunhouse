<template>
  <v-app>
    <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
    <room-background ref="scene" :playerCardCtx="playerCardCtx" :state="waitScreenState"></room-background>
    <video id="video" ref="video" muted autoplay width="800" height="600" :src="currentVideo" type="video/webm" style="display: none;"></video>
    <player-card :use-ctx="playerCardCtx[0]" @update="canvasUpdated" :info="leftPlayerInfo"></player-card>
    <player-card :use-ctx="playerCardCtx[1]" @update="canvasUpdated" :info="rightPlayerInfo"></player-card>

    <!----
    <player-path :class="{ active: waitScreenState == 'paths1' }" :info="this.playerInfo[0]"></player-path>
    <player-path
      class="right"
      :class="{ active: waitScreenState == 'paths1' }"
      :info="this.playerInfo[1]"></player-path>
    <player-path :class="{ active: waitScreenState == 'paths2' }" :info="this.playerInfo[2]"></player-path>
    <player-path
      class="right"
      :class="{ active: waitScreenState == 'paths2' }"
      :info="this.playerInfo[3]"></player-path>

    <div class="mt-font top-text" :class="{ active: true }">
      <markdown-it-vue :content="topText"></markdown-it-vue>
    </div>
  -->

    <rainwave v-if="showRainwave" style="top: 975px; left: 1521px; width: 444px; height: 124px"> </rainwave>

    <AchievementManager></AchievementManager>
  </v-app>
</template>

<style lang="scss">
.top-text {
  margin-top: 0.2em;
  font-size: 5em;
  line-height: 0.8;
  p {
    margin: 0;
  }
}
</style>

<script>
import { bindReplicant } from '../../util.js';
import MarkdownItVue from 'markdown-it-vue';

const ghostGames = nodecg.Replicant('assets:ghostGames');
const lastVideos = [];

export default {
  components: {
    MarkdownItVue,
  },

  created() {
    bindReplicant.call(this, 'playerInfo');
    bindReplicant.call(this, 'waitScreenState');
    bindReplicant.call(this, 'topText');
    bindReplicant.call(this, 'showRainwave');

    ghostGames.on('change', () => {
      if (ghostGames.value.length > 0) {
        this.$refs.video.addEventListener('ended', () => {
          this.randomVideo();
        });

        this.randomVideo();
      }
    });
  },

  methods: {
    randomVideo() {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * ghostGames.value.length);
      } while (ghostGames.value.length > 4 &&lastVideos.includes(ghostGames.value[randomIndex].url));

      this.currentVideo = "/bundles/nodecg-mysteryfunhouse/dist/model/20/tv_1.mov";

      lastVideos.push(ghostGames.value[randomIndex].url);
      if (lastVideos.length > 4) {
        lastVideos.shift();
      }

      setTimeout(() => {
        this.currentVideo = ghostGames.value[randomIndex].url
      }, 2000);
    },

    canvasUpdated() {
      this.$refs.scene.update();
    },

    updatePlayerCard() {
      if (this.waitScreenState == 'cards1' || this.waitScreenState == 'paths1' || this.waitScreenState == 'ghost') {
        this.leftPlayerInfo = this.playerInfo[0];
        this.rightPlayerInfo = this.playerInfo[1];
      } else if (this.waitScreenState == 'cards2' || this.waitScreenState == 'paths2') {
        this.leftPlayerInfo = this.playerInfo[2];
        this.rightPlayerInfo = this.playerInfo[3];
      }
    },
  },

  watch: {
    playerInfo() {
      this.updatePlayerCard();
    },

    waitScreenState() {
      this.updatePlayerCard();
    },

    ghostGames() {
      this.currentVideo = ghostGames.value[0].url
    },
  },

  data() {
    return {
      playerInfo: [],
      playerCardCtx: [
        document.createElement('canvas').getContext('2d'),
        document.createElement('canvas').getContext('2d'),
      ],
      waitScreenState: 'ghost',

      leftPlayerInfo: null,
      rightPlayerInfo: null,
      showRainwave: false,
      topText: '',
      currentVideo: "",
    };
  },
};
</script>
