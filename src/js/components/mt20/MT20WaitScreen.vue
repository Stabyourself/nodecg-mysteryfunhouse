<template>
  <v-app>
    <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
    <room-background ref="scene" :playerCardCtx="playerCardCtx" :state="waitScreenState"></room-background>
    <video id="video" ref="video" muted autoplay width="800" height="600" :src="currentVideo" type="video/webm" style="display: none;"></video>
    <player-card :use-ctx="playerCardCtx[0]" @update="canvasUpdated" :info="leftPlayerInfo"></player-card>
    <player-card :use-ctx="playerCardCtx[1]" @update="canvasUpdated" :info="rightPlayerInfo"></player-card>


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

    <transition name="vcr-osd">
      <div v-if="topText && topText.trim()" class="vcr-osd">
        <div class="vcr-osd-layer vcr-osd-base">
          <div class="vcr-osd-play"></div>
          <div class="vcr-osd-text">
            <markdown-it-vue
              v-for="(line, i) in topTextLines"
              :key="i"
              class="vcr-osd-line"
              :content="line"></markdown-it-vue>
          </div>
        </div>
        <!-- copy of the text that is only visible inside the rolling distortion band -->
        <div class="vcr-osd-layer vcr-osd-glitch" aria-hidden="true">
          <div class="vcr-osd-play"></div>
          <div class="vcr-osd-text">
            <markdown-it-vue
              v-for="(line, i) in topTextLines"
              :key="i"
              class="vcr-osd-line"
              :content="line"></markdown-it-vue>
          </div>
        </div>
      </div>
    </transition>

    <Telestrator v-if="showTelestrator" />
  </v-app>
</template>

<style lang="scss">
// VCR on-screen-display style overlay for the dashboard's "top text"
.vcr-osd {
  position: absolute;
  top: 48px;
  left: 48px;
  right: 48px;
  padding: 10px 24px;
  z-index: 5;
  pointer-events: none;

  font-family: 'VCR_OSD_MONO_1.001', monospace;
  font-size: 64px;
  line-height: 1.05;
  color: #f4f4f4;
  text-transform: uppercase;
  text-align: left;

  // faint scanlines, masked so they only affect the glyphs (not the scene behind)
  -webkit-mask-image: repeating-linear-gradient(
    to bottom,
    #000 0px,
    #000 3px,
    rgba(0, 0, 0, 0.6) 3px,
    rgba(0, 0, 0, 0.6) 5px
  );
  mask-image: repeating-linear-gradient(
    to bottom,
    #000 0px,
    #000 3px,
    rgba(0, 0, 0, 0.6) 3px,
    rgba(0, 0, 0, 0.6) 5px
  );

  p {
    margin: 0;
  }
}

// Both layers share the same tall mask that slides downward; the base layer has a
// gap where the band is and the glitch layer is only visible inside it, so the band
// looks like a slice of the text being pulled sideways as it rolls down.
.vcr-osd-layer {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 28px;
  padding: 10px 24px;

  -webkit-mask-size: 100% 300%;
  mask-size: 100% 300%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  animation: vcr-osd-roll 4s linear infinite;
}

.vcr-osd-base {
  // chromatic split + phosphor bloom
  text-shadow:
    -3px 0 rgba(255, 30, 90, 0.65),
    3px 0 rgba(0, 210, 255, 0.65),
    0 0 12px rgba(255, 255, 255, 0.45);
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.55));

  $band-gap: linear-gradient(
    to bottom,
    #000 0%,
    #000 45%,
    transparent 47%,
    transparent 53%,
    #000 55%,
    #000 100%
  );
  -webkit-mask-image: $band-gap;
  mask-image: $band-gap;
}

.vcr-osd-glitch {
  position: absolute;
  inset: 10px 24px;
  color: #fff;
  text-shadow:
    -6px 0 rgba(255, 30, 90, 0.8),
    6px 0 rgba(0, 210, 255, 0.8),
    0 0 16px rgba(255, 255, 255, 0.7);

  $band: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 45%,
    #000 47%,
    #000 53%,
    transparent 55%,
    transparent 100%
  );
  -webkit-mask-image: $band;
  mask-image: $band;

  // skewed per line (around each line's own center) rather than the whole block,
  // so the offset doesn't grow with every additional line
  .vcr-osd-line,
  .vcr-osd-play {
    transform: translateX(6px) skewX(-16deg);
  }

  .vcr-osd-play {
    border-left-color: #fff;
  }
}

.vcr-osd-text {
  flex: 1;
  min-width: 0;
}

.vcr-osd-line {
  // keep blank lines from the dashboard as empty rows
  min-height: 1.05em;
}

// band travels from above the text to below it, then rests off-screen for a bit
@keyframes vcr-osd-roll {
  0% {
    -webkit-mask-position: 0 100%;
    mask-position: 0 100%;
  }
  60%,
  100% {
    -webkit-mask-position: 0 0%;
    mask-position: 0 0%;
  }
}

.vcr-osd-play {
  flex: none;
  width: 0;
  height: 0;
  margin-top: 8px;
  border-top: 24px solid transparent;
  border-bottom: 24px solid transparent;
  border-left: 40px solid #f4f4f4;
  filter:
    drop-shadow(-3px 0 rgba(255, 30, 90, 0.65))
    drop-shadow(3px 0 rgba(0, 210, 255, 0.65))
    drop-shadow(0 0 8px rgba(255, 255, 255, 0.45));
  animation: vcr-osd-blink 1.2s steps(1) infinite;
}

@keyframes vcr-osd-blink {
  0% { opacity: 1; }
  60% { opacity: 0; }
}

.vcr-osd-enter-active,
.vcr-osd-leave-active {
  transition: opacity 0.15s steps(3);
}
.vcr-osd-enter,
.vcr-osd-leave-to {
  opacity: 0;
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

  computed: {
    // every newline in the dashboard field is its own line element, rendered as
    // inline markdown on its own
    topTextLines() {
      return (this.topText || '').trim().split('\n');
    },
  },

  created() {
    bindReplicant.call(this, 'playerInfo');
    bindReplicant.call(this, 'waitScreenState');
    bindReplicant.call(this, 'topText');
  },

  mounted() {
    // Attached exactly once, here, instead of inside the replicant's change handler:
    // ghostGames can emit 'change' many times over a long-running session (asset
    // syncs, reconnects, etc.), and re-registering an 'ended' listener on every one of
    // those - without ever removing the old ones - meant a single video finishing
    // could fire randomVideo() once per accumulated listener, all at once.
    this.$refs.video.addEventListener('ended', () => {
      this.randomVideo();
    });

    let hasPickedFirstVideo = false;
    ghostGames.on('change', () => {
      if (!hasPickedFirstVideo && ghostGames.value.length > 0) {
        hasPickedFirstVideo = true;
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
        this.$refs.scene.update();
      } else if (this.waitScreenState == 'cards2' || this.waitScreenState == 'paths2') {
        this.leftPlayerInfo = this.playerInfo[2];
        this.rightPlayerInfo = this.playerInfo[3];
        this.$refs.scene.update();
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

      // in obs the telestrator is its own source
      showTelestrator: !window.obsstudio,

      playerCardCtx: [
        document.createElement('canvas').getContext('2d'),
        document.createElement('canvas').getContext('2d'),
      ],
      waitScreenState: 'ghost',

      leftPlayerInfo: null,
      rightPlayerInfo: null,
      topText: '',
      currentVideo: "",
    };
  },
};
</script>
