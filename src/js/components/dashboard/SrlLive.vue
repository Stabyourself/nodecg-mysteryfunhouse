<template>
  <div v-if="live" class="srl-live" :title="`Finishes, the game and the timer come from the SRL race: ${title}`">
    <span class="dot"></span>
    Live
  </div>
</template>

<style lang="scss">
// a bar across the top of a panel
.srl-live {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  background: rgba(229, 57, 53, 0.18);
  color: #ff6b66;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e53935;
    animation: srl-live-pulse 1.6s ease-in-out infinite;
  }
}

@keyframes srl-live-pulse {
  50% {
    opacity: 0.3;
  }
}
</style>

<script>
import { bindReplicant } from '../../util.js';

// shows while the srl watcher is on a race (while it's going and for a while after, someone can
// still .undone). with players, only when one of those player numbers is in it
export default {
  props: {
    players: { type: Array, default: null },
  },

  created() {
    bindReplicant.call(this, 'srlRace');
  },

  computed: {
    live() {
      const { race, slots, watching } = this.srlRace;
      if (!race || !watching) return false;

      return !this.players || this.players.some((player) => slots[player]);
    },

    title() {
      const race = this.srlRace.race;
      return race ? [race.goal, race.game].filter(Boolean).join(' · ') : '';
    },
  },

  data() {
    return {
      srlRace: { race: null, slots: [null, null, null, null], watching: false, polled: 0, error: null },
    };
  },
};
</script>
