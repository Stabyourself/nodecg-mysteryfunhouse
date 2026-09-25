<template>
  <div class="obs-video" :class="{ 'in-flow': inFlow }" :style="boxStyle">
    <!-- outside obs (telestrator) just show the twitch stream so people know where to draw -->
    <twitch-player
      v-if="!inObs && twitchUrl"
      :url="twitchUrl"
      :player-number="player"
      :volume="0"
      :crop="crop"
      :aspectratio="aspectratio"
      :width="width"
      :height="height"
      :opacity="visible === false ? 0 : 1"
    ></twitch-player>
    <div v-else-if="!inObs" class="obs-video-placeholder">{{ sceneName }}</div>
  </div>
</template>

<style lang="scss" scoped>
.obs-video {
  position: absolute;

  // sits in the layout like a normal element
  &.in-flow {
    position: relative;
    flex-shrink: 0;
  }
}

.obs-video-placeholder {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.6);
  font-family: Roboto, sans-serif;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<script>
import { obsConnect, obsRequest, onObsEvent, onObsReady } from '../obs.js';
import { saveReplay, startReplayBuffer } from '../replay-buffer.js';

// player pages are 1080p, same as the crop values
const SOURCE_WIDTH = 1920;
const SOURCE_HEIGHT = 1080;
const CROP_SPACE_WIDTH = 1920;
const CROP_SPACE_HEIGHT = 1080;

const OPEN_TIMEOUT = 6000;
const OPEN_POLL = 100;
const OPEN_RETRY = 300;

// wait a bit so the replay frame is actually there before the live moves away
const REPLAY_SETTLE = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PIP_DURATION = 600;
const PIP_FRAME = 1000 / 60;

// has to match the fade in ReplayOverlay.vue
const BORDER_FADE = 300;

// end events right after starting are from the last replay
const END_GRACE = 1000;

const PARAMS = new URLSearchParams(window.location.search);

// LIVE/REPLAY borders, has to be above the videos. same nodecg key as this page, in
// case the server wants one
const OVERLAY_NAME = 'Replay Overlay';
const OVERLAY_KEY = PARAMS.get('key') ? `?key=${encodeURIComponent(PARAMS.get('key'))}` : '';
const OVERLAY_PATH = `/bundles/nodecg-mysteryfunhouse/graphics/replay-overlay.html${OVERLAY_KEY}`;

// &obsscene=... in the url, so layouts don't move each other's videos
const OWN_SCENES = PARAMS.getAll('obsscene');

// so two videos don't both create the overlay
let overlayQueue = Promise.resolve();

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default {
  name: 'ObsVideo',

  created() {
    this.inObs = !!window.obsstudio;
    this.followed = [];

    const n = this.player;
    this.follow(`player${n}crop`, (crop) => (this.crop = crop || [0, 0, 0, 0]));
    this.follow(`player${n}aspectratio`, (aspectratio) => (this.aspectratio = aspectratio || false));
    this.follow(`player${n}streamHidden`, (hidden) => (this.streamHidden = !!hidden));

    if (!this.inObs) {
      this.follow(`player${n}twitch`, (url) => (this.twitchUrl = url || ''));
      return;
    }

    obsConnect();
    startReplayBuffer();

    this.offReady = onObsReady(() => this.findTargets());
    this.offEvent = onObsEvent(this.onEvent);

    this.follow(`player${n}replayBuffer`, (value) => (this.replayBuffer = Number(value) || 1));
    this.follow(`player${n}replay`, this.onReplay);

    // see publishAudible
    this.audibleRep = nodecg.Replicant(`player${n}audible`, { defaultValue: false });
    this.follow(`player${n}audible`, this.publishAudible);

    // overlay asks for this when it loads
    nodecg.listenFor('requestVideoRects', this.announceRects);
  },

  mounted() {
    if (!this.inFlow) return;

    // fonts loading late can move stuff around, so keep measuring
    this.measure();
    if (document.fonts) document.fonts.ready.then(this.measure);
    window.addEventListener('load', this.measure);
    this.measureTimer = setInterval(this.measure, 1000);
  },

  beforeDestroy() {
    if (this.offReady) this.offReady();
    if (this.offEvent) this.offEvent();
    clearInterval(this.pipTimer);
    clearInterval(this.measureTimer);
    window.removeEventListener('load', this.measure);
    clearTimeout(this.endTimer);
    nodecg.unlisten('requestVideoRects', this.announceRects);

    for (const [replicant, handler] of this.followed) {
      replicant.removeListener('change', handler);
    }
  },

  methods: {
    follow(name, handler) {
      const replicant = nodecg.Replicant(name);
      replicant.on('change', handler);
      this.followed.push([replicant, handler]);
    },

    measure() {
      const rect = this.$el.getBoundingClientRect();
      const x = Math.round(rect.left + window.scrollX);
      const y = Math.round(rect.top + window.scrollY);

      if (x !== this.measuredX) this.measuredX = x;
      if (y !== this.measuredY) this.measuredY = y;
    },

    onEvent(type, data) {
      // scenes changed, look again
      if (['SceneCreated', 'SceneRemoved', 'SceneNameChanged', 'SceneItemCreated', 'SceneItemRemoved'].includes(type)) {
        this.findTargets();
      }

      if (type === 'CurrentProgramSceneChanged') {
        this.setProgramScene(data.sceneName);
      }

      if (type === 'InputMuteStateChanged' && data.inputName === this.liveInput) {
        this.liveMuted = data.inputMuted;
        this.publishAudible();
      }

      if (type === 'InputVolumeChanged' && data.inputName === this.liveInput) {
        this.liveVolume = data.inputVolumeMul;
        this.publishAudible();
      }

      if (
        type === 'MediaInputPlaybackEnded' &&
        data.inputName === this.replayName &&
        this.replayId &&
        Date.now() - this.replayShownAt > END_GRACE
      ) {
        nodecg.sendMessage('replayEnded', { player: this.player, id: this.replayId });
      }
    },

    // creating stuff fires SceneItemCreated which starts another lookup, don't run two at once
    findTargets() {
      if (this.finding) {
        this.findAgain = true;
        return;
      }

      this.finding = true;
      this.lookup().finally(() => {
        this.finding = false;

        if (this.findAgain) {
          this.findAgain = false;
          this.findTargets();
        }
      });
    },

    // find every scene the video is in (studio mode edits preview, not program)
    async lookup() {
      try {
        const { scenes } = await obsRequest('GetSceneList');
        const targets = [];

        for (const scene of scenes) {
          if (OWN_SCENES.length && !OWN_SCENES.includes(scene.sceneName)) continue;

          try {
            const { sceneItemId } = await obsRequest('GetSceneItemId', {
              sceneName: scene.sceneName,
              sourceName: this.sceneName,
            });

            targets.push({ sceneName: scene.sceneName, sceneItemId, replayItemId: null });
          } catch (e) {
            // not in this scene
          }
        }

        this.liveInput = await this.findLiveInput();
        this.targets = targets;
        ({ baseWidth: this.baseWidth, baseHeight: this.baseHeight } = await obsRequest('GetVideoSettings'));
        const { currentProgramSceneName } = await obsRequest('GetCurrentProgramScene');
        this.setProgramScene(currentProgramSceneName);
        await this.readAudio();
        await this.removeSourceRecord();
        await this.ensureReplay(targets);
        await (overlayQueue = overlayQueue.then(() => this.ensureOverlay(targets)));

        this.targets = targets;
        await this.apply();
      } catch (e) {
        console.error(`[obs-video] ${this.sceneName} lookup: ${e.message}`);
      }
    },

    // the browser source inside the video scene
    async findLiveInput() {
      try {
        const { sceneItems } = await obsRequest('GetSceneItemList', { sceneName: this.sceneName });
        const browser = sceneItems.find((item) => item.inputKind === 'browser_source');

        if (!browser) {
          console.error(`[obs-video] ${this.sceneName} has no browser source in it, so its audio can't be read`);
          return null;
        }

        return browser.sourceName;
      } catch (e) {
        // not a scene, it's the source itself
        return this.sceneName;
      }
    },

    // add the replay to every scene the video is in, hidden and right below the video
    async ensureReplay(targets) {
      if (!targets.length) return;

      let exists = true;
      try {
        await obsRequest('GetInputSettings', { inputName: this.replayName });
      } catch (e) {
        exists = false;
      }

      for (const target of targets) {
        try {
          const { sceneItemId } = await obsRequest('GetSceneItemId', {
            sceneName: target.sceneName,
            sourceName: this.replayName,
          });

          target.replayItemId = sceneItemId;
        } catch (e) {
          try {
            const { sceneItemId } = exists
              ? await obsRequest('CreateSceneItem', {
                  sceneName: target.sceneName,
                  sourceName: this.replayName,
                  sceneItemEnabled: false,
                })
              : await obsRequest('CreateInput', {
                  sceneName: target.sceneName,
                  inputName: this.replayName,
                  inputKind: 'ffmpeg_source',
                  inputSettings: {
                    is_local_file: true,
                    local_file: '',
                    restart_on_activate: true,
                    close_when_inactive: true,
                    clear_on_media_end: true,
                    looping: false,
                    hw_decode: true,
                  },
                  sceneItemEnabled: false,
                });

            exists = true;
            target.replayItemId = sceneItemId;
          } catch (e) {
            console.error(`[obs-video] could not add ${this.replayName} to ${target.sceneName}: ${e.message}`);
          }
        }

        if (target.replayItemId != null) {
          await this.placeByLive(target, target.replayItemId, false);
        }
      }
    },

    async ensureOverlay(targets) {
      let exists = true;
      try {
        await obsRequest('GetInputSettings', { inputName: OVERLAY_NAME });
      } catch (e) {
        exists = false;
      }

      for (const target of targets) {
        let overlayItemId;

        // an overlays scene in here brings its own, then it is up to that scene to sit
        // above the videos
        if (await this.overlayIsNested(target.sceneName)) continue;

        try {
          ({ sceneItemId: overlayItemId } = await obsRequest('GetSceneItemId', {
            sceneName: target.sceneName,
            sourceName: OVERLAY_NAME,
          }));
        } catch (e) {
          try {
            ({ sceneItemId: overlayItemId } = exists
              ? await obsRequest('CreateSceneItem', {
                  sceneName: target.sceneName,
                  sourceName: OVERLAY_NAME,
                })
              : await obsRequest('CreateInput', {
                  sceneName: target.sceneName,
                  inputName: OVERLAY_NAME,
                  inputKind: 'browser_source',
                  inputSettings: {
                    url: window.location.origin + OVERLAY_PATH,
                    width: SOURCE_WIDTH,
                    height: SOURCE_HEIGHT,
                  },
                }));

            exists = true;
          } catch (e) {
            console.error(`[obs-video] could not add ${OVERLAY_NAME} to ${target.sceneName}: ${e.message}`);
            continue;
          }
        }

        await this.placeByLive(target, overlayItemId, true);
      }
    },

    // is the overlay in one of the scenes nested in this one
    async overlayIsNested(sceneName) {
      try {
        const { sceneItems } = await obsRequest('GetSceneItemList', { sceneName });

        for (const item of sceneItems) {
          if (item.sourceType !== 'OBS_SOURCE_TYPE_SCENE' || item.isGroup) continue;

          try {
            await obsRequest('GetSceneItemId', { sceneName: item.sourceName, sourceName: OVERLAY_NAME });
            return true;
          } catch (e) {
            // not in this one
          }
        }
      } catch (e) {
        console.error(`[obs-video] looking through ${sceneName}: ${e.message}`);
      }

      return false;
    },

    // put an item right above/below the live video
    async placeByLive(target, sceneItemId, above) {
      try {
        const { sceneItemIndex: liveIndex } = await obsRequest('GetSceneItemIndex', {
          sceneName: target.sceneName,
          sceneItemId: target.sceneItemId,
        });

        const { sceneItemIndex: index } = await obsRequest('GetSceneItemIndex', {
          sceneName: target.sceneName,
          sceneItemId,
        });

        if (above ? index < liveIndex : index > liveIndex) {
          await obsRequest('SetSceneItemIndex', {
            sceneName: target.sceneName,
            sceneItemId,
            sceneItemIndex: liveIndex,
          });
        }
      } catch (e) {
        console.error(`[obs-video] order next to ${this.sceneName} in ${target.sceneName}: ${e.message}`);
      }
    },

    // tell the overlay where to draw, only once the live is fully in the corner
    announceRects() {
      if (!this.inObs) return;

      // other layouts with this player stay quiet so they don't clear it
      if (!this.replayShown && !this.announcedReplay) return;

      const rect = (transform) => ({
        x: transform.positionX,
        y: transform.positionY,
        width: transform.boundsWidth,
        height: transform.boundsHeight,
      });

      const replay = this.replayShown && this.pip === 1 && !this.bordersGone ? rect(this.replayTransform) : null;
      this.announcedReplay = !!replay;

      nodecg.sendMessage('videoRects', {
        player: this.player,
        live: this.visible !== false ? rect(this.liveTransform) : null,
        replay,
      });
    },

    // replays used to come from a source record filter on the player, which keeps encoding
    // as long as it's there
    async removeSourceRecord() {
      if (!this.liveInput) return;

      try {
        await obsRequest('RemoveSourceFilter', { sourceName: this.liveInput, filterName: this.bufferName });
      } catch (e) {
        // already gone
      }
    },

    async mediaAction(action) {
      await obsRequest('TriggerMediaInputAction', {
        inputName: this.replayName,
        mediaAction: `OBS_WEBSOCKET_MEDIA_INPUT_ACTION_${action}`,
      });
    },

    // keep trying until the file is open, then pause it at the last `length` ms
    // (obs keeps the longest buffer of all players), returns how long it will play
    async openLast(file, savedAt, length) {
      let retryAt = Date.now() + OPEN_RETRY;
      let retries = 0;
      let status = {};

      while (Date.now() < savedAt + OPEN_TIMEOUT) {
        status = await obsRequest('GetMediaInputStatus', { inputName: this.replayName });
        const { mediaState, mediaDuration } = status;

        if (mediaState === 'OBS_MEDIA_STATE_PLAYING' && mediaDuration > 0) {
          const start = Math.max(0, mediaDuration - length);
          await this.mediaAction('PAUSE');
          await obsRequest('SetMediaInputCursor', { inputName: this.replayName, mediaCursor: start });
          return mediaDuration - start;
        }

        // retry if it failed or opened a half written file (playing but no length)
        // leave it alone while it's opening
        const failed =
          mediaState === 'OBS_MEDIA_STATE_PLAYING' ||
          ['OBS_MEDIA_STATE_ERROR', 'OBS_MEDIA_STATE_ENDED', 'OBS_MEDIA_STATE_STOPPED', 'OBS_MEDIA_STATE_NONE'].includes(
            mediaState
          );

        // restart only rewinds an open file, so set the file again instead
        // (swap the slashes so obs sees a change)
        if (failed && Date.now() >= retryAt) {
          retryAt = Date.now() + OPEN_RETRY;
          retries++;
          const local_file = retries % 2 ? file.replace(/\//g, '\\') : file;
          await obsRequest('SetInputSettings', { inputName: this.replayName, inputSettings: { local_file } });
        }

        await sleep(OPEN_POLL);
      }

      throw new Error(`${file} did not open (last state ${status.mediaState}, duration ${status.mediaDuration})`);
    },

    async onReplay(replay, old) {
      // first value is from before the page loaded
      if (old === undefined || !this.inObs) return;

      if (replay) {
        // only the layout that's on air plays it
        if (await this.onProgram()) this.startReplay(replay);
      } else if (this.replayId) {
        this.endReplay();
      }
    },

    async onProgram() {
      try {
        const { currentProgramSceneName } = await obsRequest('GetCurrentProgramScene');
        return this.targets.some((target) => target.sceneName === currentProgramSceneName);
      } catch (e) {
        return false;
      }
    },

    async startReplay(replay) {
      this.replayId = replay.id;
      this.bordersGone = false;

      try {
        // take down a replay that's still showing
        if (this.replayShown) await this.showReplay(false);

        // the recording is the whole program, remember where the video was on it
        this.replayRect = this.transform;

        const file = await saveReplay();
        const savedAt = Date.now();
        if (this.replayId !== replay.id) return;

        // reset speed in case it's still on slowmo from before
        await obsRequest('SetInputSettings', {
          inputName: this.replayName,
          inputSettings: { local_file: file, speed_percent: 100 },
        });

        await this.muteReplay();
        await this.showReplay(true);

        // still hidden under the live at this point
        const playTime = await this.openLast(file, savedAt, this.replayBuffer * 1000);
        if (this.replayId !== replay.id) return;

        // the file can be smaller than the canvas (output scaling), crop to match
        await this.readReplaySize();
        await this.placeReplay();

        // give the replay a moment to show up before moving the live away
        await sleep(REPLAY_SETTLE);
        if (this.replayId !== replay.id) return;
        await this.mediaAction('PLAY');

        // end events before this are from the half written file
        this.replayShownAt = Date.now();

        // start moving back early so it's done right when the replay ends
        clearTimeout(this.endTimer);
        this.endTimer = setTimeout(() => {
          if (this.replayId === replay.id) {
            nodecg.sendMessage('replayEnded', { player: this.player, id: replay.id });
          }
        }, Math.max(0, playTime - BORDER_FADE - PIP_DURATION));

        this.animatePip(1);
      } catch (e) {
        console.error(`[obs-video] ${this.replayName} start: ${e.message}`);

        // failed, tell the dock
        if (this.replayId === replay.id) {
          nodecg.sendMessage('replayEnded', { player: this.player, id: replay.id });
        }
      }
    },

    async endReplay() {
      this.replayId = 0;
      clearTimeout(this.endTimer);

      // fade the borders out first
      this.bordersGone = true;
      this.announceRects();
      await sleep(BORDER_FADE);
      if (this.replayId) return;

      await this.animatePip(0);

      // new replay started in the meantime
      if (this.replayId) return;

      await this.showReplay(false);
    },

    async readReplaySize() {
      const target = this.targets.find((target) => target.replayItemId != null);
      if (!target) return;

      try {
        const { sceneItemTransform } = await obsRequest('GetSceneItemTransform', {
          sceneName: target.sceneName,
          sceneItemId: target.replayItemId,
        });

        if (sceneItemTransform.sourceWidth > 0 && sceneItemTransform.sourceHeight > 0) {
          this.replayWidth = sceneItemTransform.sourceWidth;
          this.replayHeight = sceneItemTransform.sourceHeight;
        }
      } catch (e) {
        console.error(`[obs-video] ${this.replayName} size: ${e.message}`);
      }
    },

    async placeReplay() {
      for (const target of this.targets) {
        if (target.replayItemId == null) continue;

        try {
          await obsRequest('SetSceneItemTransform', {
            sceneName: target.sceneName,
            sceneItemId: target.replayItemId,
            sceneItemTransform: this.replayTransform,
          });
        } catch (e) {
          console.error(`[obs-video] ${this.replayName} in ${target.sceneName}: ${e.message}`);
        }
      }
    },

    async showReplay(shown) {
      this.replayShown = shown;
      if (shown) this.replayShownAt = Date.now();
      this.announceRects();

      if (shown) await this.placeReplay();

      for (const target of this.targets) {
        if (target.replayItemId == null) continue;

        try {
          await obsRequest('SetSceneItemEnabled', {
            sceneName: target.sceneName,
            sceneItemId: target.replayItemId,
            sceneItemEnabled: shown,
          });
        } catch (e) {
          console.error(`[obs-video] ${this.replayName} in ${target.sceneName}: ${e.message}`);
        }
      }
    },

    async readAudio() {
      if (!this.liveInput) return;

      try {
        ({ inputMuted: this.liveMuted } = await obsRequest('GetInputMute', { inputName: this.liveInput }));
        ({ inputVolumeMul: this.liveVolume } = await obsRequest('GetInputVolume', { inputName: this.liveInput }));
        this.publishAudible();
      } catch (e) {
        console.error(`[obs-video] ${this.liveInput} audio: ${e.message}`);
      }
    },

    setProgramScene(sceneName) {
      this.onAir = this.targets.some((target) => target.sceneName === sceneName);
      this.publishAudible();
    },

    // audio icon: not muted and not at -inf
    // only the layout that's on air writes it, nodecg doesn't like simultaneous writes
    publishAudible() {
      if (!this.onAir) return;
      if (this.liveMuted == null || this.liveVolume == null) return;
      if (this.audibleRep.status !== 'declared') return;

      const audible = !this.liveMuted && this.liveVolume > 0;
      if (this.audibleRep.value !== audible) this.audibleRep.value = audible;
    },

    // no replay audio, the recording has the whole program mix in it
    // (obs monitors muted sources too, so turn monitoring off as well)
    async muteReplay() {
      try {
        await obsRequest('SetInputMute', { inputName: this.replayName, inputMuted: true });
        await obsRequest('SetInputAudioMonitorType', {
          inputName: this.replayName,
          monitorType: 'OBS_MONITORING_TYPE_NONE',
        });
      } catch (e) {
        console.error(`[obs-video] ${this.replayName} audio: ${e.message}`);
      }
    },

    // obs can't animate transforms, so send one every frame
    animatePip(target) {
      clearInterval(this.pipTimer);
      if (this.pipResolve) this.pipResolve();

      const from = this.pip;
      const started = performance.now();

      return new Promise((resolve) => {
        this.pipResolve = resolve;

        const step = () => {
          const t = Math.min(1, (performance.now() - started) / PIP_DURATION);
          const done = t >= 1;

          this.pip = lerp(from, target, ease(t));

          // skip frames while one is still in flight, but always send the last one
          if (done || !this.pipInFlight) this.moveLive();

          if (done) {
            clearInterval(this.pipTimer);
            this.pipTimer = null;
            this.pipResolve = null;
            resolve();
          }
        };

        this.pipTimer = setInterval(step, PIP_FRAME);
        step();
      });
    },

    moveLive() {
      const sceneItemTransform = this.liveTransform;
      this.announceRects();

      this.pipInFlight = true;
      Promise.all(
        this.targets.map((target) =>
          obsRequest('SetSceneItemTransform', {
            sceneName: target.sceneName,
            sceneItemId: target.sceneItemId,
            sceneItemTransform,
          }).catch(() => {})
        )
      ).then(() => {
        this.pipInFlight = false;
      });
    },

    async apply() {
      this.announceRects();

      for (const target of this.targets) {
        try {
          await obsRequest('SetSceneItemTransform', {
            sceneName: target.sceneName,
            sceneItemId: target.sceneItemId,
            sceneItemTransform: this.liveTransform,
          });

          await obsRequest('SetSceneItemEnabled', {
            sceneName: target.sceneName,
            sceneItemId: target.sceneItemId,
            sceneItemEnabled: this.visible !== false,
          });

          if (target.replayItemId != null) {
            await obsRequest('SetSceneItemTransform', {
              sceneName: target.sceneName,
              sceneItemId: target.replayItemId,
              sceneItemTransform: this.replayTransform,
            });

            await obsRequest('SetSceneItemEnabled', {
              sceneName: target.sceneName,
              sceneItemId: target.replayItemId,
              sceneItemEnabled: this.replayShown,
            });
          }
        } catch (e) {
          console.error(`[obs-video] ${this.sceneName} in ${target.sceneName}: ${e.message}`);
        }
      }
    },
  },

  computed: {
    sceneName() {
      return this.scene || `Player ${this.player + 1} Video`;
    },

    visible() {
      return !this.streamHidden;
    },

    // no x/y given = sit in the layout and measure
    inFlow() {
      return this.x == null || this.y == null;
    },

    posX() {
      return this.inFlow ? this.measuredX : this.x;
    },

    posY() {
      return this.inFlow ? this.measuredY : this.y;
    },

    boxStyle() {
      const size = { width: this.width + 'px', height: this.height + 'px' };
      return this.inFlow ? size : { ...size, left: this.x + 'px', top: this.y + 'px' };
    },

    replayName() {
      return this.replay || `Player ${this.player + 1} Replay`;
    },

    bufferName() {
      return `${this.replayName} Buffer`;
    },

    // same maths as TwitchPlayer
    transform() {
      const [left, right, top, bottom] = this.crop ?? [0, 0, 0, 0];

      const cropWidth = CROP_SPACE_WIDTH - left - right;
      const cropHeight = CROP_SPACE_HEIGHT - top - bottom;

      let hScale = this.width / cropWidth;
      let vScale = this.height / cropHeight;

      if (this.aspectratio) {
        const split = this.aspectratio.split(':');
        const targetAspect = split[0] / split[1];
        const aspectRatio = cropWidth / cropHeight;

        if (aspectRatio > targetAspect) {
          hScale = vScale * (targetAspect / aspectRatio);
        } else {
          vScale = hScale / (targetAspect / aspectRatio);
        }

        if (hScale * cropWidth > this.width) {
          const diff = this.width / (hScale * cropWidth);
          hScale = hScale * diff;
          vScale = vScale * diff;
        }

        if (vScale * cropHeight > this.height) {
          const diff = this.height / (vScale * cropHeight);
          hScale = hScale * diff;
          vScale = vScale * diff;
        }
      } else {
        //auto scale to touch our 4:3 from the inside
        const scale = Math.min(hScale, vScale);

        hScale = scale;
        vScale = scale;
      }

      const boundsWidth = cropWidth * hScale;
      const boundsHeight = cropHeight * vScale;

      const toSourceX = SOURCE_WIDTH / CROP_SPACE_WIDTH;
      const toSourceY = SOURCE_HEIGHT / CROP_SPACE_HEIGHT;

      return {
        positionX: this.posX + (this.width - boundsWidth) / 2,
        positionY: this.posY + (this.height - boundsHeight) / 2,
        boundsType: 'OBS_BOUNDS_STRETCH',
        boundsAlignment: 0,
        boundsWidth,
        boundsHeight,
        cropLeft: Math.round(left * toSourceX),
        cropRight: Math.round(right * toSourceX),
        cropTop: Math.round(top * toSourceY),
        cropBottom: Math.round(bottom * toSourceY),
      };
    },

    // the replay file is the whole program, cut out where the live was when it was saved
    replayTransform() {
      const rect = this.replayRect || this.transform;
      const baseWidth = this.baseWidth || SOURCE_WIDTH;
      const baseHeight = this.baseHeight || SOURCE_HEIGHT;
      const toFileX = (this.replayWidth || baseWidth) / baseWidth;
      const toFileY = (this.replayHeight || baseHeight) / baseHeight;
      const crop = (value, scale) => Math.max(0, Math.round(value * scale));

      return {
        positionX: rect.positionX,
        positionY: rect.positionY,
        boundsType: 'OBS_BOUNDS_STRETCH',
        boundsAlignment: 0,
        boundsWidth: rect.boundsWidth,
        boundsHeight: rect.boundsHeight,
        cropLeft: crop(rect.positionX, toFileX),
        cropRight: crop(baseWidth - rect.positionX - rect.boundsWidth, toFileX),
        cropTop: crop(rect.positionY, toFileY),
        cropBottom: crop(baseHeight - rect.positionY - rect.boundsHeight, toFileY),
      };
    },

    // live goes to the bottom corner of the slot that's closer to the middle of the screen
    liveTransform() {
      const full = this.transform;
      if (!this.pip) return full;

      const boundsWidth = full.boundsWidth * this.pipScale;
      const boundsHeight = full.boundsHeight * this.pipScale;
      const onRight = this.posX + this.width / 2 > SOURCE_WIDTH / 2;

      const corner = {
        positionX: onRight
          ? this.posX + this.pipMargin
          : this.posX + this.width - this.pipMargin - boundsWidth,
        positionY: this.posY + this.height - this.pipMargin - boundsHeight,
        boundsWidth,
        boundsHeight,
      };

      const transform = { ...full };
      for (const key of Object.keys(corner)) {
        transform[key] = lerp(full[key], corner[key], this.pip);
      }

      return transform;
    },
  },

  watch: {
    crop() {
      this.apply();
    },

    aspectratio() {
      this.apply();
    },

    visible() {
      this.apply();
    },

    posX() {
      this.apply();
    },

    posY() {
      this.apply();
    },
  },

  props: {
    // which player (0-3)
    player: Number,
    // no x/y = measure from the layout
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    // defaults to "Player <n> Video" (n counting from 1)
    scene: String,
    // defaults to "Player <n> Replay"
    replay: String,
    // live size during replay
    pipScale: { type: Number, default: 0.3 },
    // gap to the slot edge
    pipMargin: { type: Number, default: 0 },
  },

  data() {
    return {
      inObs: false,
      crop: [0, 0, 0, 0],
      aspectratio: false,
      streamHidden: false,
      twitchUrl: '',
      targets: [],
      measuredX: 0,
      measuredY: 0,
      liveInput: null,
      baseWidth: 0,
      baseHeight: 0,
      replayRect: null,
      replayWidth: 0,
      replayHeight: 0,
      replayBuffer: 15,
      replayId: 0,
      replayShown: false,
      replayShownAt: 0,
      // mixer state of the stream source (volume 0 = -inf)
      liveMuted: null,
      onAir: false,
      liveVolume: null,
      pip: 0,
    };
  },
};
</script>
