<template>
  <v-app>
    <v-main>
      <v-container>
        <v-btn
          color="primary"
          block
          class="mb-2"
          nodecg-dialog="load-srl-race-dialog"
        >
          Load from SRL race
        </v-btn>

        <v-btn
          color="primary"
          variant="outlined"
          block
          class="mb-3"
          nodecg-dialog="load-challonge-dialog"
        >
          Load from match ID
        </v-btn>

        <label class="field-label">Wait Screen state</label>

        <v-btn
          color="grey"
          block
          size="small"
          class="mt-2 mb-2"
          :variant="waitScreenState !== 'ghost' ? 'outlined' : 'elevated'"
          @click="waitScreenState = 'ghost'"
        >
          Idle
        </v-btn>

        <v-row density="compact" class="mb-1">
          <v-col>
            <v-btn
              color="blue"
              block
              size="small"
              :variant="waitScreenState !== 'cards1' ? 'outlined' : 'elevated'"
              @click="waitScreenState = 'cards1'"
            >
              Player Cards 1
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
              color="blue"
              block
              size="small"
              :variant="waitScreenState !== 'cards2' ? 'outlined' : 'elevated'"
              @click="waitScreenState = 'cards2'"
            >
              Player Cards 2
            </v-btn>
          </v-col>
        </v-row>

        <v-row density="compact" class="mb-3">
          <v-col>
            <v-btn
              color="purple"
              block
              size="small"
              :variant="waitScreenState !== 'paths1' ? 'outlined' : 'elevated'"
              @click="waitScreenState = 'paths1'"
            >
              Tournament Paths 1
            </v-btn>
          </v-col>
          <v-col>
            <v-btn
              color="purple"
              block
              size="small"
              :variant="waitScreenState !== 'paths2' ? 'outlined' : 'elevated'"
              @click="waitScreenState = 'paths2'"
            >
              Tournament Paths 2
            </v-btn>
          </v-col>
        </v-row>

        <v-textarea label="Top text" v-model="topText" rows="3"></v-textarea>

        <v-divider class="my-7"></v-divider>

        <label class="field-label">Event Logo</label>
        <div
          class="select-img-wrap mb-3"
          nodecg-dialog="event-logo-select-dialog"
        >
          <img
            class="select-img"
            :src="currentEventLogo ? currentEventLogo.url : ''"
          />
          <div class="select-img-border"></div>
        </div>

        <v-divider class="my-7"></v-divider>

        <div class="live-status">
          <h2 class="live-status-heading">Live Match Status</h2>

          <srl-live></srl-live>

          <!-- the followed race -->
          <v-sheet border rounded class="race-card mb-3">
            <template v-if="srlRace.race">
              <div class="d-flex align-center ga-2">
                <v-icon size="small" icon="mdi-flag-checkered"></v-icon>
                <span class="text-caption text-medium-emphasis">SRL #{{ srlRace.race.id }}</span>
                <v-spacer></v-spacer>
                <v-chip size="x-small" label :color="raceStateColor">{{ srlRace.race.statetext }}</v-chip>
              </div>
              <div class="race-title">{{ raceTitle || 'Untitled race' }}</div>
            </template>
            <div v-else class="d-flex align-center ga-2 text-medium-emphasis">
              <v-icon size="small" icon="mdi-flag-off-outline"></v-icon>
              No SRL race followed
            </div>

            <v-alert
              v-if="srlRace.error"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-2 text-caption"
            >
              {{ srlRace.error }}
            </v-alert>
          </v-sheet>

          <!-- who's in it -->
          <div v-if="activePlayers.length" class="player-list">
            <div
              v-for="{ player, i } of activePlayers"
              :key="i"
              class="player-row"
            >
              <div class="player-badge" :class="`match-${Math.floor(i / 2) + 1}`">{{ i + 1 }}</div>

              <div class="player-body">
                <div class="d-flex align-center ga-1">
                  <span class="player-name">{{ player.name || '—' }}</span>
                  <v-tooltip location="top" v-if="playerInfo[i] && !playerInfo[i].career">
                    <template v-slot:activator="{ props }">
                      <v-icon size="x-small" color="warning" icon="mdi-alert" v-bind="props"></v-icon>
                    </template>
                    <span>No career info! (This is normal for new participants)</span>
                  </v-tooltip>
                </div>

                <div class="player-srl">
                  <template v-if="!player.srl">
                    <v-icon size="x-small" color="warning" icon="mdi-help-circle"></v-icon>
                    No SRL name
                  </template>
                  <template v-else-if="srlRace.slots[i]">
                    <v-icon size="x-small" color="success" icon="mdi-check-circle"></v-icon>
                    {{ srlRace.slots[i].displayname }}
                  </template>
                  <template v-else-if="srlRace.race">
                    <v-icon size="x-small" color="error" icon="mdi-close-circle"></v-icon>
                    {{ player.srl }} isn't in the race
                  </template>
                  <template v-else>
                    <v-icon size="x-small" icon="mdi-account-outline"></v-icon>
                    {{ player.srl }}
                  </template>
                </div>
              </div>

              <v-chip
                v-if="srlRace.slots[i]"
                size="x-small"
                label
                class="player-state"
                :color="entrantColor(srlRace.slots[i])"
                :variant="srlRace.slots[i].state == 'Finished' ? 'flat' : 'tonal'"
              >
                {{ entrantState(srlRace.slots[i]) }}
              </v-chip>
            </div>
          </div>
          <div v-else class="text-caption text-medium-emphasis">No players loaded.</div>

          <v-btn
            v-if="srlRace.race"
            color="error"
            variant="text"
            block
            size="small"
            class="mt-3"
            prepend-icon="mdi-link-variant-off"
            @click="detach"
          >
            Detach from SRL race
          </v-btn>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.live-status {
  .live-status-heading {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 12px;
  }

  .race-card {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
  }

  .race-title {
    margin-top: 4px;
    font-weight: 500;
    line-height: 1.3;
  }

  .player-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .player-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
  }

  // match colours, same as the match panel headers
  .player-badge {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: white;

    &.match-1 {
      background: #d32f2f;
    }

    &.match-2 {
      background: #1976d2;
    }
  }

  .player-body {
    flex: 1;
    min-width: 0;
  }

  .player-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-srl {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-state {
    flex: none;
  }
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "waitScreenState", "waitScreenState", 0);
    bindReplicant.call(this, "topText");
    bindReplicant.call(this, "playerInfo");
    bindReplicant.call(this, "currentEventLogo");

    // read only, srl.js keeps it
    nodecg.Replicant("srlRace").on("change", (value) => {
      if (value) this.srlRace = value;
    });
    for (let i = 0; i < 4; i++) {
      for (const prop of ["name", "srl"]) {
        nodecg.Replicant(`player${i}${prop}`).on("change", (value) => {
          this.players[i][prop] = value ?? "";
        });
      }
    }
  },

  computed: {
    raceTitle() {
      const race = this.srlRace.race;
      return [race.goal, race.game].filter(Boolean).join(" · ");
    },

    // srl's race states: 1/2 entry open/closed, 3 in progress, 4 complete, 5 over
    raceStateColor() {
      const state = this.srlRace.race.state;
      if (state == 3) return "success";
      if (state < 3) return "info";
      return "grey";
    },

    // only the slots with someone in them
    activePlayers() {
      return this.players
        .map((player, i) => ({ player, i }))
        .filter(({ player }) => player.name || player.srl);
    },
  },

  methods: {
    // back to manual: srl.js stops following the race
    detach() {
      nodecg.sendMessage("srlDetach");
    },

    // "#1 · 1:02:03", "Forfeit", "Ready"
    entrantState(entrant) {
      if (entrant.state != "Finished") return entrant.state;

      const s = entrant.time;
      const pad = (n) => String(n).padStart(2, "0");
      const time = `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
      return `#${entrant.place} · ${time}`;
    },

    entrantColor(entrant) {
      if (entrant.state == "Finished") return "success";
      if (entrant.state == "Forfeit" || entrant.state == "Disqualified") return "error";
      if (entrant.state == "Ready") return "info";
      return undefined;
    },
  },

  data() {
    return {
      waitScreenState: false,
      srlRace: { race: null, slots: [null, null, null, null], watching: false, polled: 0, error: null },
      players: [0, 1, 2, 3].map(() => ({ name: "", srl: "" })),
      playerInfo: [],
      topText: "",
      currentEventLogo: {},
    };
  },
};
</script>
