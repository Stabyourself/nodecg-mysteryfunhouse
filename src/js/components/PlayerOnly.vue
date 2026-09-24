<template>
  <div class="player-only" ref="player"></div>
</template>

<style lang="scss" scoped>
// don't cover or transform this, twitch stops playing when it's hidden/scaled/faded
// (cropping happens in obs)
.player-only {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  ::v-deep iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
}
</style>

<script>
import { bindReplicant } from '../util.js';
import { obsConnect, obsRequest, onObsEvent, onObsReady, waitForObs, OBS_INPUT_ACTIVE_EVENTS } from '../obs.js';

// obs says "not ready" while loading a scene collection
const FIND_RETRIES = 10;
const FIND_RETRY_DELAY = 1000;

// less than the dashboard's 5s timeout
const FRAME_CONNECT_WAIT = 4000;

const twitchOptions = {
  channel: null,
  autoplay: true,
  muted: true,
  parent: ['nodecg-new.mysteryfun.house', 'nodecg.mysteryfun.house', 'localhost'],
  quality: 'auto',
  layout: 'video',
};

export default {
  name: 'PlayerOnly',

  created() {
    const params = new URLSearchParams(window.location.search);
    this.playerNumber = Number(params.get('n') ?? 0);

    const n = this.playerNumber;
    bindReplicant.call(this, 'url', `player${n}twitch`);

    nodecg.listenFor(`stream${n}reload`, () => this.createPlayer());

    // obs monitors sources that aren't on air (and muted ones), so mute ourselves then
    if (window.obsstudio) {
      obsConnect(OBS_INPUT_ACTIVE_EVENTS);
      onObsReady(this.findOwnSource);
      nodecg.listenFor('requestPlayerFrame', this.sendFrame);
      onObsEvent((type, data) => {
        if (type === 'InputActiveStateChanged' && data.inputName === this.sourceName) {
          this.onAir = data.videoActive;
          this.applyAudio();
        }

        if (type === 'InputMuteStateChanged' && data.inputName === this.sourceName) {
          this.obsMuted = data.inputMuted;
          this.applyAudio();
        }

        if (type === 'InputNameChanged' && data.oldInputName === this.sourceName) {
          this.sourceName = data.inputName;
        }
      });
    }
  },

  mounted() {
    if (this.url) {
      this.createPlayer();
    }
  },

  methods: {
    createPlayer() {
      if (!this.url) return;

      this.$refs.player.innerHTML = '';

      const embed = new Twitch.Embed(
        this.$refs.player,
        Object.assign({}, twitchOptions, {
          channel: this.url,
          width: window.innerWidth,
          height: window.innerHeight,
        })
      );

      embed.addEventListener(Twitch.Embed.READY, () => {
        this.player = embed.getPlayer();
      });

      embed.addEventListener(Twitch.Embed.PLAYING, this.applyAudio);
    },

    // find our own browser source by its url
    async findOwnSource() {
      try {
        const { inputs } = await obsRequest('GetInputList', { inputKind: 'browser_source' });

        for (const input of inputs) {
          const { inputSettings } = await obsRequest('GetInputSettings', { inputName: input.inputName });
          const url = inputSettings.url || '';

          if (url.includes('/graphics/player.html') && new URL(url, window.location.href).searchParams.get('n') == this.playerNumber) {
            this.sourceName = input.inputName;
            ({ videoActive: this.onAir } = await obsRequest('GetSourceActive', { sourceName: input.inputName }));
            ({ inputMuted: this.obsMuted } = await obsRequest('GetInputMute', { inputName: input.inputName }));
            this.applyAudio();
            return;
          }
        }

        console.error(`[player] no browser source in obs shows player.html?n=${this.playerNumber}`);
      } catch (e) {
        // obs answers "not ready" while it's still loading the scene collection
        if (e.message.includes('not ready') && this.findRetries++ < FIND_RETRIES) {
          setTimeout(this.findOwnSource, FIND_RETRY_DELAY);
          return;
        }

        console.error(`[player] finding own source: ${e.message}`);
      }
    },

    // the cropping dashboard needs a screenshot, and unlike the layouts we're loaded and
    // connected even when obs starts on a scene without players in it
    async sendFrame(request) {
      if (request.player !== this.playerNumber) return;

      try {
        await waitForObs(FRAME_CONNECT_WAIT);
        if (!this.sourceName) await this.findOwnSource();
        if (!this.sourceName) throw new Error('could not find own browser source');

        const { imageData } = await obsRequest('GetSourceScreenshot', {
          sourceName: this.sourceName,
          imageFormat: 'jpg',
          imageCompressionQuality: 85,
        });

        nodecg.sendMessage('playerFrame', { player: this.playerNumber, imageData });
      } catch (e) {
        console.error(`[player] screenshot: ${e.message}`);
        nodecg.sendMessage('playerFrame', { player: this.playerNumber, error: e.message });
      }
    },

    // always full volume, the mixer in obs controls the level
    applyAudio() {
      if (!this.player) return;

      const muted = !this.onAir || this.obsMuted;
      this.player.setMuted(muted);
      if (!muted) this.player.setVolume(1);
    },
  },

  watch: {
    url() {
      this.createPlayer();
    },
  },

  data() {
    return {
      playerNumber: 0,
      player: null,
      url: '',
      // assume on air until obs tells us
      onAir: true,
      obsMuted: false,
      sourceName: null,
      findRetries: 0,
    };
  },
};
</script>
