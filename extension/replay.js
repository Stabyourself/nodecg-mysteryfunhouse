const ctx = require("./nodecg");
const nodecg = ctx.get();

// keeps track of which replays are running, the actual replay happens in obs (ObsVideo.vue)
const PLAYERS = 4;

// saving and opening the file can take a few seconds
const LOAD_MARGIN = 6000;

const players = [];
for (let i = 0; i < PLAYERS; i++) {
  players.push({
    buffer: nodecg.Replicant(`player${i}replayBuffer`, { defaultValue: 15 }),
    replay: nodecg.Replicant(`player${i}replay`, {
      defaultValue: null,
      persistent: false,
    }),
    endTimer: null,
  });
}

function stop({ player }) {
  const state = players[player];
  if (!state) return;

  clearTimeout(state.endTimer);
  state.endTimer = null;
  state.replay.value = null;
}

function start({ player }) {
  const state = players[player];
  if (!state) return;

  clearTimeout(state.endTimer);

  const buffer = Math.max(1, Number(state.buffer.value) || 1);
  const length = buffer * 1000 + LOAD_MARGIN;

  state.replay.value = { id: Date.now() };

  state.endTimer = setTimeout(() => stop({ player }), length);
}

nodecg.listenFor("replayStart", start);
nodecg.listenFor("replayStop", stop);

// obs noticed the replay ended
nodecg.listenFor("replayEnded", ({ player, id }) => {
  const state = players[player];
  if (state && state.replay.value && state.replay.value.id === id) {
    stop({ player });
  }
});
