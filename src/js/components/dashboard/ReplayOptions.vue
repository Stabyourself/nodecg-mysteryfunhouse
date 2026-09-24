<template>
  <!-- plain markup instead of vuetify so the obs dock looks like the rest of obs (yami theme) -->
  <div class="replay-dock">
    <div class="grid">
      <button
        v-for="player in players"
        :key="player.number"
        :class="['obs-button', { live: player.replay }]"
        @click="player.replay ? stop(player.number) : start(player.number)"
      >
        <template v-if="player.replay"><i class="mdi mdi-access-point"></i> To live</template>
        <template v-else><i class="mdi mdi-replay"></i> Player {{ player.number + 1 }}</template>
      </button>
    </div>

    <div class="grid buffers">
      <label v-for="player in players" :key="player.number" class="buffer">
        <span class="buffer-label">Player {{ player.number + 1 }} buffer</span>
        <span class="obs-input">
          <input
            :value="player.buffer"
            @input="setBuffer(player.number, $event.target.value)"
            type="number"
            min="1"
            max="120"
          />
          <span class="suffix">s</span>
        </span>
      </label>
    </div>
  </div>
</template>

<script>
import { bindReplicant } from '../../util.js';

const PLAYERS = 4;

export default {
  created() {
    for (let i = 0; i < PLAYERS; i++) {
      bindReplicant.call(this, `player${i}replay`, `player${i}replay`, 0);
      bindReplicant.call(this, `player${i}replayBuffer`);
    }
  },

  methods: {
    start(player) {
      nodecg.sendMessage('replayStart', { player });
    },

    stop(player) {
      nodecg.sendMessage('replayStop', { player });
    },

    setBuffer(player, value) {
      this[`player${player}replayBuffer`] = Number(value);
    },
  },

  computed: {
    players() {
      const players = [];

      for (let i = 0; i < PLAYERS; i++) {
        players.push({
          number: i,
          replay: this[`player${i}replay`],
          buffer: this[`player${i}replayBuffer`],
        });
      }

      return players;
    },
  },

  data() {
    return {
      player0replay: null,
      player1replay: null,
      player2replay: null,
      player3replay: null,
      player0replayBuffer: 15,
      player1replayBuffer: 15,
      player2replayBuffer: 15,
      player3replayBuffer: 15,
    };
  },
};
</script>

<style scoped>
/* colors taken from obs' default yami theme */
.replay-dock {
  padding: 4px;
  color: #fff;
  font-family: 'Open Sans', 'Segoe UI', sans-serif;
  font-size: 15px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.buffers {
  margin-top: 12px;
  row-gap: 8px;
}

.obs-button {
  height: 48px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #3c404b;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.obs-button:hover {
  background: #4f535f;
  border-color: #7c7e87;
}

.obs-button:active {
  background: #2e313a;
}

.obs-button.live {
  background: #9a2a2f;
}

.obs-button.live:hover {
  background: #b1343a;
}

.obs-button .mdi {
  margin-right: 4px;
}

.buffer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.buffer-label {
  font-size: 13px;
  color: #d2d2d2;
}

.obs-input {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #3c404b;
  border-radius: 4px;
  background: #1d1f26;
}

.obs-input:hover {
  border-color: #7c7e87;
}

.obs-input:focus-within {
  border-color: #476be5;
}

.obs-input input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  font: inherit;
}

.suffix {
  color: #bebebe;
}
</style>
