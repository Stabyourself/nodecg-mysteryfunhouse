import { obsIdentified, obsRequest, onObsEvent, onObsReady } from './obs.js';

// obs' own replay buffer records the whole program once, ObsVideo crops each player out of it
// (source record encoded every player on its own, which was too much for some pcs)

const PLAYERS = 4;

// a bit more than the longest player buffer, so the start isn't cut off
const EXTRA_SECONDS = 2;

const SAVE_TIMEOUT = 10000;
const STOP_TIMEOUT = 5000;
const STOP_POLL = 100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buffers = [];
let started = false;

// every layout page has a few videos, one sync at a time per page is enough
let queue = Promise.resolve();

// the dock's player buffers decide how long obs keeps
export function startReplayBuffer() {
  if (started) return;
  started = true;

  for (let i = 0; i < PLAYERS; i++) {
    const replicant = nodecg.Replicant(`player${i}replayBuffer`);
    replicant.on('change', (value) => {
      buffers[i] = Number(value) || 0;
      sync();
    });
  }

  onObsReady(sync);
}

function sync() {
  // runs again once connected
  if (!obsIdentified()) return;

  // pages with only some buffers loaded would set a shorter one and restart it again
  if (buffers.filter((buffer) => buffer != null).length < PLAYERS) return;

  const seconds = Math.ceil(Math.max(1, ...buffers.filter((buffer) => buffer > 0))) + EXTRA_SECONDS;

  queue = queue
    .then(() => apply(seconds))
    .catch((e) => {
      console.error(`[replay-buffer] ${e.message} (is the replay buffer turned on in Settings > Output?)`);
    });
}

async function outputCategory() {
  const { parameterValue } = await obsRequest('GetProfileParameter', {
    parameterCategory: 'Output',
    parameterName: 'Mode',
  });

  return parameterValue === 'Advanced' ? 'AdvOut' : 'SimpleOutput';
}

async function isActive() {
  const { outputActive } = await obsRequest('GetReplayBufferStatus');
  return outputActive;
}

// obs only reads the length when the buffer starts, so changing it restarts the buffer
async function apply(seconds) {
  const category = await outputCategory();
  const { parameterValue } = await obsRequest('GetProfileParameter', {
    parameterCategory: category,
    parameterName: 'RecRBTime',
  });

  const changed = Number(parameterValue) !== seconds;
  if (changed) {
    await obsRequest('SetProfileParameter', {
      parameterCategory: category,
      parameterName: 'RecRBTime',
      parameterValue: String(seconds),
    });
  }

  let active = await isActive();
  if (active && !changed) return;

  if (active) {
    await obsRequest('StopReplayBuffer');

    const until = Date.now() + STOP_TIMEOUT;
    while (active && Date.now() < until) {
      await sleep(STOP_POLL);
      active = await isActive();
    }
  }

  try {
    await obsRequest('StartReplayBuffer');
  } catch (e) {
    // another page started it in the meantime
    if (!(await isActive())) throw e;
  }

  await warnFormat(category);
}

// mkv files don't report a length, the replay can't be opened without one
async function warnFormat(category) {
  for (const parameterName of ['RecFormat2', 'RecFormat']) {
    try {
      const { parameterValue } = await obsRequest('GetProfileParameter', { parameterCategory: category, parameterName });
      if (!parameterValue) continue;

      if (parameterValue.includes('mkv')) {
        console.error(`[replay-buffer] recording format is ${parameterValue}, replays need mp4 (Settings > Output)`);
      }
      return;
    } catch (e) {
      // older obs, try the next name
    }
  }
}

// several videos asking at once get the same file
let saving = null;

// resolves with the path once the file is written
export function saveReplay() {
  if (saving) return saving;

  saving = new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      off();
    };

    const timer = setTimeout(() => {
      done();
      reject(new Error('replay buffer did not save in time'));
    }, SAVE_TIMEOUT);

    const off = onObsEvent((type, data) => {
      if (type !== 'ReplayBufferSaved') return;
      done();
      resolve(data.savedReplayPath);
    });

    obsRequest('SaveReplayBuffer').catch((e) => {
      done();
      reject(e);
    });
  }).finally(() => {
    saving = null;
  });

  return saving;
}
