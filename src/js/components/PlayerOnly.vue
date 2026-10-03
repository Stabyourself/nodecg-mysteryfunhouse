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

  :deep(iframe) {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
}
</style>

<script>
import { markRaw } from 'vue';
import { bindReplicant } from '../util.js';
import { obsConnect, obsRequest, onObsEvent, onObsReady, waitForObs } from '../obs.js';

// obs only renders a browser source (and twitch only plays) while it is shown somewhere. a
// scene with every player is nested tiny at the bottom of the overlays scene (which every
// layout nests) so they always are, which also keeps the cropping screenshots fresh
const KEEPALIVE_SCENE = 'Player Keepalive';
const HOST_SCENE = 'Overlays';
const KEEPALIVE_SCALE = 0.001;
const KEEPALIVE_STAGGER = 400;

const AIR_EVENTS = [
  'CurrentProgramSceneChanged',
  'SceneItemEnableStateChanged',
  'SceneItemCreated',
  'SceneItemRemoved',
  'SceneCreated',
  'SceneRemoved',
];
const AIR_DEPTH = 8;

// obs says "not ready" while loading a scene collection
const FIND_RETRIES = 10;
const FIND_RETRY_DELAY = 1000;

// less than the dashboard's 5s timeout
const FRAME_CONNECT_WAIT = 4000;

// obs hides the page while the source isn't shown anywhere, twitch pauses then and doesn't
// start again by itself
const RESUME_CHECK = 2000;

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
    if (!window.obsstudio) {
      this.onAir = true;
    } else {
      obsConnect();
      onObsReady(this.findOwnSource);
      nodecg.listenFor('requestPlayerFrame', this.sendFrame);
      onObsEvent((type, data) => {
        // the keepalive scene keeps the source active everywhere, so videoActive says
        // nothing about being on air, look at the program scene instead
        if (AIR_EVENTS.includes(type)) {
          this.checkOnAir();
          if (type === 'SceneCreated') this.keepAlive();
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

    window.addEventListener('obsSourceVisibleChanged', this.resume);
    document.addEventListener('visibilitychange', this.resume);
    this.resumeTimer = setInterval(this.resume, RESUME_CHECK);
  },

  beforeUnmount() {
    window.removeEventListener('obsSourceVisibleChanged', this.resume);
    document.removeEventListener('visibilitychange', this.resume);
    clearInterval(this.resumeTimer);
  },

  methods: {
    resume() {
      if (document.hidden || !this.player) return;
      if (this.player.isPaused() && !this.player.getEnded()) this.player.play();
    },

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
        // twitch's own object, vue must not wrap it
        this.player = markRaw(embed.getPlayer());
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
            ({ inputMuted: this.obsMuted } = await obsRequest('GetInputMute', { inputName: input.inputName }));
            await this.checkOnAir();
            this.keepAlive();
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

    // is the source visible in the program scene, looking through nested scenes and groups
    async checkOnAir() {
      if (!this.sourceName) return;

      try {
        const { currentProgramSceneName } = await obsRequest('GetCurrentProgramScene');
        this.onAir = await this.sceneHasSource(currentProgramSceneName, new Set(), 0);
        this.applyAudio();
      } catch (e) {
        // obs is busy loading, stay silent until the next event looks again
        this.onAir = false;
        this.applyAudio();
      }
    },

    async sceneHasSource(sceneName, seen, depth, isGroup = false) {
      if (seen.has(sceneName) || depth > AIR_DEPTH) return false;
      seen.add(sceneName);

      const { sceneItems } = await obsRequest(isGroup ? 'GetGroupSceneItemList' : 'GetSceneItemList', { sceneName });

      for (const item of sceneItems) {
        if (!item.sceneItemEnabled) continue;
        if (item.sourceName === this.sourceName) return true;

        const nested = item.isGroup || item.sourceType === 'OBS_SOURCE_TYPE_SCENE';
        if (nested && item.sourceName !== KEEPALIVE_SCENE) {
          if (await this.sceneHasSource(item.sourceName, seen, depth + 1, item.isGroup)) return true;
        }
      }

      return false;
    },

    // players page one by one so they don't both create the scene or its items
    keepAlive() {
      clearTimeout(this.keepAliveTimer);
      this.keepAliveTimer = setTimeout(async () => {
        if (this.keeping) {
          this.keepAlive();
          return;
        }

        this.keeping = true;
        try {
          await this.ensureKeepalive();
        } catch (e) {
          console.error(`[player] keepalive: ${e.message}`);
        } finally {
          this.keeping = false;
        }
      }, KEEPALIVE_STAGGER * (this.playerNumber + 1));
    },

    async ensureKeepalive() {
      const { scenes } = await obsRequest('GetSceneList');

      if (!scenes.some((scene) => scene.sceneName === KEEPALIVE_SCENE)) {
        try {
          await obsRequest('CreateScene', { sceneName: KEEPALIVE_SCENE });
        } catch (e) {
          // another player made it just now
        }
      }

      if (!(await this.hasItem(KEEPALIVE_SCENE, this.sourceName))) {
        try {
          await obsRequest('CreateSceneItem', {
            sceneName: KEEPALIVE_SCENE,
            sourceName: this.sourceName,
            sceneItemEnabled: true,
          });
        } catch (e) {
          console.error(`[player] could not add ${this.sourceName} to ${KEEPALIVE_SCENE}: ${e.message}`);
        }
      }

      if (!scenes.some((scene) => scene.sceneName === HOST_SCENE) || (await this.hasItem(HOST_SCENE, KEEPALIVE_SCENE))) return;

      try {
        const { sceneItemId } = await obsRequest('CreateSceneItem', {
          sceneName: HOST_SCENE,
          sourceName: KEEPALIVE_SCENE,
          sceneItemEnabled: true,
        });

        await obsRequest('SetSceneItemTransform', {
          sceneName: HOST_SCENE,
          sceneItemId,
          sceneItemTransform: { positionX: 0, positionY: 0, scaleX: KEEPALIVE_SCALE, scaleY: KEEPALIVE_SCALE },
        });
        await obsRequest('SetSceneItemIndex', { sceneName: HOST_SCENE, sceneItemId, sceneItemIndex: 0 });
      } catch (e) {
        console.error(`[player] could not add ${KEEPALIVE_SCENE} to ${HOST_SCENE}: ${e.message}`);
      }
    },

    async hasItem(sceneName, sourceName) {
      try {
        await obsRequest('GetSceneItemId', { sceneName, sourceName });
        return true;
      } catch (e) {
        return false;
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
      // silent until obs says this player is in the program scene (outside obs there's no
      // scene to check, see created)
      onAir: false,
      obsMuted: false,
      sourceName: null,
      findRetries: 0,
    };
  },
};
</script>
