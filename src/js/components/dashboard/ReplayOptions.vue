<template>
  <v-app>
    <v-main>
      <v-container>
        <v-row dense>
          <v-col v-for="player in players" :key="player.number" cols="6">
            <v-btn v-if="player.replay" block x-large color="red" @click="stop(player.number)">
              <v-icon left>mdi-access-point</v-icon>
              To live
            </v-btn>

            <v-btn v-else block x-large color="primary" @click="start(player.number)">
              <v-icon left>mdi-replay</v-icon>
              Player {{ player.number + 1 }}
            </v-btn>
          </v-col>
        </v-row>

        <v-row class="mt-4" dense>
          <v-col v-for="player in players" :key="player.number" cols="6">
            <v-text-field
              :value="player.buffer"
              @input="setBuffer(player.number, $event)"
              type="number"
              min="1"
              max="120"
              :label="`Player ${player.number + 1} buffer`"
              suffix="s"
              dense
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
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
