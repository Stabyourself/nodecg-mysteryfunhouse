<template>
  <v-app>
    <v-container class="srl-loader">
      <div class="loader-header">
        <span class="text-subtitle-1">Open SRL races</span>
        <v-btn
          icon="mdi-refresh"
          size="small"
          variant="text"
          title="Refresh"
          :loading="loadingRaces"
          @click="fetchRaces"
        ></v-btn>
      </div>

      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
      <v-alert v-if="success" type="success" variant="tonal" density="compact" class="mb-3">{{ success }}</v-alert>

      <v-card
        v-for="race in sortedRaces"
        :key="race.id"
        variant="outlined"
        class="race mb-3"
        :class="{ choosing: choosing(race) }"
      >
        <div class="race-top">
          <div class="race-title">
            <div class="goal">{{ race.goal || 'No goal set' }}</div>
            <div class="game text-medium-emphasis">{{ race.game }}</div>
          </div>

          <v-chip size="small" variant="tonal" :color="race.state == 3 ? 'green' : undefined">
            <span v-if="race.state == 3" class="running-dot"></span>
            {{ race.statetext }}
          </v-chip>
        </div>

        <div class="entrants">
          <v-chip
            v-for="entrant in race.entrants"
            :key="entrant.name"
            size="small"
            :variant="entrant.known ? 'flat' : 'outlined'"
            :color="entrant.known ? 'primary' : undefined"
            :prepend-icon="entrant.known ? 'mdi-account-check' : undefined"
            :title="entrant.known ? 'Signed up for this event' : 'No player has this SRL name'"
          >
            {{ entrant.name }}
          </v-chip>
          <span v-if="!race.entrants.length" class="text-medium-emphasis">Nobody joined yet</span>
        </div>

        <div v-if="choosing(race)" class="choice">
          <div class="text-medium-emphasis mb-1">More than one match fits. Pick one, or two racing together:</div>
          <v-checkbox
            v-for="match in choice.matches"
            :key="match.id"
            v-model="choice.ticked"
            :value="match.id"
            :disabled="blocked(match)"
            density="compact"
            hide-details
          >
            <template v-slot:label>
              <span class="match-id">#{{ match.id }}</span>
              {{ match.players[0] }} vs {{ match.players[1] }}
              <span class="text-medium-emphasis ml-1">· {{ match.round }}</span>
            </template>
          </v-checkbox>
        </div>

        <v-card-actions>
          <span v-if="race.entrants.length" class="text-caption text-medium-emphasis">
            {{ knownCount(race) }} of {{ race.entrants.length }} signed up
          </span>
          <v-spacer></v-spacer>
          <v-btn v-if="choosing(race)" variant="text" @click="choice = null">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="loadingRaceId == race.id"
            :disabled="loadingRaceId !== null || knownCount(race) < 2 || (choosing(race) && !choice.ticked.length)"
            @click="loadRace(race)"
          >
            {{ choosing(race) && choice.ticked.length == 2 ? 'Load both' : 'Load' }}
          </v-btn>
        </v-card-actions>
      </v-card>

      <div v-if="!races.length && !loadingRaces" class="empty text-medium-emphasis">
        <v-icon icon="mdi-flag-outline" size="40"></v-icon>
        <div>No open races on SRL</div>
      </div>
    </v-container>
  </v-app>
</template>

<style scoped lang="scss">
.loader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.race {
  padding: 12px 14px 4px;
  border-color: rgba(255, 255, 255, 0.15);

  &.choosing {
    border-color: rgb(var(--v-theme-primary));
  }
}

.race-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.race-title {
  min-width: 0;

  .goal {
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .game {
    font-size: 0.85rem;
  }
}

.running-dot {
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: running-pulse 1.6s ease-in-out infinite;
}

@keyframes running-pulse {
  50% {
    opacity: 0.3;
  }
}

.entrants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.choice {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);

  .match-id {
    margin-right: 6px;
    font-weight: 600;
  }
}

.v-card-actions {
  padding: 8px 0 4px;
  min-height: 0;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
}
</style>

<script>
// last-resort safety net like in ChallongeLoader, the server bounds its own calls
const RESPONSE_TIMEOUT_MS = 25000;

function timeout(ms, message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

export default {
  created() {
    // the dialog stays loaded, so the races are fetched each time it opens
    document.addEventListener('dialog-opened', this.fetchRaces);
    this.fetchRaces();
  },

  unmounted() {
    document.removeEventListener('dialog-opened', this.fetchRaces);
  },

  computed: {
    // the ones with our players first, those are the matches
    sortedRaces() {
      return [...this.races].sort(
        (a, b) => this.knownCount(b) - this.knownCount(a) || b.entrants.length - a.entrants.length,
      );
    },
  },

  methods: {
    fetchRaces() {
      this.loadingRaces = true;
      this.error = null;
      this.success = null;
      this.choice = null;

      nodecg
        .sendMessage('srlListRaces')
        .then((races) => {
          this.races = races;
        })
        .catch((error) => {
          this.error = `Couldn't get the SRL races: ${error.message}`;
        })
        .finally(() => {
          this.loadingRaces = false;
        });
    },

    knownCount(race) {
      return race.entrants.filter((entrant) => entrant.known).length;
    },

    choosing(race) {
      return this.choice?.raceId == race.id;
    },

    // a third match, or one with a player that's already in a ticked one
    blocked(match) {
      const ticked = this.choice.ticked;
      if (ticked.includes(match.id)) return false;
      if (ticked.length >= 2) return true;

      return this.choice.matches
        .filter((other) => ticked.includes(other.id))
        .some((other) => other.playerIds.some((id) => match.playerIds.includes(id)));
    },

    loadRace(race) {
      this.error = null;
      this.success = null;
      this.loadingRaceId = race.id;

      const options = { raceId: race.id };
      if (this.choosing(race)) options.matchIds = this.choice.ticked;

      Promise.race([
        nodecg.sendMessage('loadSrlRace', options),
        timeout(
          RESPONSE_TIMEOUT_MS,
          "The server didn't respond in time. It may still be working in the background " +
            '- check the server logs, or try again in a bit.',
        ),
      ])
        .then((result) => {
          if (result.choose) {
            this.choice = { raceId: race.id, matches: result.choose, ticked: result.suggested };
          } else {
            this.choice = null;
            this.success = `Loaded ${result.loaded}`;
          }
        })
        .catch((error) => {
          this.error = error.message;
        })
        .finally(() => {
          this.loadingRaceId = null;
        });
    },
  },

  data() {
    return {
      races: [],
      loadingRaces: false,
      loadingRaceId: null,
      // the matches to pick from for one race: { raceId, matches, ticked }
      choice: null,
      error: null,
      success: null,
    };
  },
};
</script>
