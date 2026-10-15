<template>
  <v-app>
    <v-main>
      <v-container class="srl-test">
        <v-alert v-if="!srlFake.enabled" type="info" variant="tonal">
          Test mode is off. Add <code>"srlTest": true</code> to <code>cfg/nodecg-mysteryfunhouse.json</code> and
          restart NodeCG to get a fake SRL race here.
        </v-alert>

        <template v-else>
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4" closable @click:close="error = null">
            {{ error }}
          </v-alert>

          <!-- making one -->
          <v-card variant="outlined" class="section">
            <div class="section-title">Fake race</div>
            <v-row dense>
              <v-col cols="12" md="6" class="make-row">
                <v-autocomplete
                  v-model="matchIds"
                  :items="matchItems"
                  label="Challonge matches"
                  multiple
                  chips
                  closable-chips
                  density="compact"
                  hide-details
                  :loading="loadingMatches"
                  @update:focused="(focused) => focused && fetchMatches()"
                ></v-autocomplete>
                <v-btn
                  color="primary"
                  variant="flat"
                  :disabled="!matchIds.length"
                  :loading="busy == 'srlTestFromMatches'"
                  @click="send('srlTestFromMatches', { ids: matchIds.join(',') })"
                >
                  Make race
                </v-btn>
              </v-col>
              <v-col cols="12" md="6" class="make-row">
                <v-text-field
                  v-model="pastId"
                  label="Racers of a past SRL race"
                  placeholder="290093"
                  density="compact"
                  hide-details
                  @keydown.enter="send('srlTestFromPast', { id: pastId })"
                ></v-text-field>
                <v-btn variant="outlined" :loading="busy == 'srlTestFromPast'" @click="send('srlTestFromPast', { id: pastId })">
                  Copy racers
                </v-btn>
              </v-col>
            </v-row>
            <div v-if="race" class="race-line mt-3">
              <v-chip size="small" variant="tonal" :color="stateColor">{{ stateText }}</v-chip>
              <span class="text-medium-emphasis">{{ race.id }}</span>
              <span v-if="race.startedAt != null" class="clock">{{ clock }}</span>
              <v-spacer></v-spacer>
              <v-btn size="small" variant="text" color="red" @click="send('srlTestClear')">Remove race</v-btn>
            </div>
            <div v-else class="text-medium-emphasis mt-3">
              No fake race. It shows up in "Load from SRL race" once it's made.
            </div>
          </v-card>

          <template v-if="race">
            <!-- the room's game -->
            <v-card variant="outlined" class="section">
              <div class="section-title">Game</div>
              <div class="current-game mb-3">
                <span class="text-medium-emphasis">SRL game</span>
                <strong>{{ race.game }}</strong>
                <span class="text-medium-emphasis ml-3">Goal</span>
                <strong>{{ race.goal || '–' }}</strong>
              </div>

              <v-autocomplete
                v-model="sheetGame"
                :items="sheetGames"
                item-title="title"
                return-object
                label="A game from the games sheet"
                density="compact"
                :loading="loadingGames"
                hide-details
                class="mb-3"
                @update:focused="(focused) => focused && fetchGames()"
              ></v-autocomplete>
              <div class="button-row mb-4">
                <v-btn :disabled="!sheetGame" variant="outlined" @click="setGame(sheetGame.title, sheetGame.code, sheetGame.goal)">
                  As the SRL game
                </v-btn>
                <v-btn
                  :disabled="!sheetGame"
                  variant="outlined"
                  @click="setGame('New Game', 'newgame', `${sheetGame.title} - ${sheetGame.goal}`)"
                >
                  In the goal (New Game)
                </v-btn>
              </div>

              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field v-model="gameName" label="SRL game" placeholder="New Game" density="compact" hide-details></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="goal" label="Goal" density="compact" hide-details></v-text-field>
                </v-col>
                <v-col cols="12" md="2">
                  <v-btn block variant="flat" color="primary" @click="setGame(gameName, '', goal)">Set</v-btn>
                </v-col>
              </v-row>
            </v-card>

            <!-- the race -->
            <v-card variant="outlined" class="section">
              <div class="section-title">Race</div>
              <div class="button-row mb-3">
                <v-btn color="green" variant="flat" prepend-icon="mdi-flag" :disabled="started" @click="send('srlTestStart')">
                  Start (.go)
                </v-btn>
                <v-btn variant="outlined" prepend-icon="mdi-undo" :disabled="!started" @click="send('srlTestReset')">
                  Back to before the start
                </v-btn>
              </div>

              <div v-for="entrant in race.entrants" :key="entrant.name" class="entrant">
                <span class="name">{{ entrant.name }}</span>
                <v-chip size="small" variant="tonal" :color="entrantColor(entrant)" :prepend-icon="entrantIcon(entrant)">
                  {{ entrant.state }}
                </v-chip>
                <span class="time">{{ entrant.state == 'Finished' ? formatTime(entrant.time) : '' }}</span>
                <v-spacer></v-spacer>

                <template v-if="!started">
                  <v-btn v-if="entrant.state != 'Ready'" size="small" variant="outlined" @click="act(entrant, 'ready')">.ready</v-btn>
                  <v-btn v-else size="small" variant="outlined" @click="act(entrant, 'unready')">.unready</v-btn>
                </template>
                <template v-else-if="entrant.state == 'In Progress'">
                  <v-btn size="small" color="green" variant="flat" @click="act(entrant, 'done')">.done</v-btn>
                  <v-btn size="small" color="red" variant="flat" @click="act(entrant, 'forfeit')">.forfeit</v-btn>
                </template>
                <v-btn v-else size="small" color="orange" variant="outlined" @click="act(entrant, 'undone')">
                  {{ entrant.state == 'Forfeit' ? '.unforfeit' : '.undone' }}
                </v-btn>
              </div>
            </v-card>
          </template>
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped lang="scss">
.srl-test {
  max-width: 900px;
}

.section {
  padding: 16px;
  margin-bottom: 16px;
  border-color: rgba(255, 255, 255, 0.15);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.make-row,
.race-line,
.button-row,
.current-game,
.entrant {
  display: flex;
  align-items: center;
  gap: 8px;
}

.button-row {
  flex-wrap: wrap;
}

.clock {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.entrant {
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  .name {
    min-width: 160px;
    font-weight: 500;
  }

  .time {
    min-width: 70px;
    font-variant-numeric: tabular-nums;
  }
}
</style>

<script>
import { bindReplicant, formatTimer } from '../../util.js';

export default {
  created() {
    bindReplicant.call(this, 'srlFake');
    this.ticker = setInterval(() => (this.now = Date.now()), 250);
  },

  unmounted() {
    clearInterval(this.ticker);
  },

  computed: {
    race() {
      return this.srlFake.race;
    },

    matchItems() {
      return this.matches.map((match) => ({
        value: match.id,
        title: `#${match.id} ${match.players.join(' vs ')}${match.played ? ' (played)' : ''}`,
      }));
    },

    started() {
      return this.race?.startedAt != null;
    },

    done() {
      return this.started && this.race.entrants.every((e) => e.state == 'Finished' || e.state == 'Forfeit');
    },

    stateText() {
      if (this.done) return 'Complete';
      if (this.started) return this.now < this.race.startedAt ? 'Counting down' : 'In Progress';
      return 'Entry Open';
    },

    stateColor() {
      return this.done ? undefined : this.started ? 'green' : 'blue';
    },

    // the race time, or the countdown before it
    clock() {
      const ms = this.now - this.race.startedAt;
      return ms < 0 ? `-${Math.ceil(-ms / 1000)}` : formatTimer(ms, false, false);
    },
  },

  watch: {
    // the fields follow the room, so changing one starts from what it is
    race: {
      immediate: true,
      handler(race) {
        if (!race) return;
        this.gameName = race.game;
        this.goal = race.goal;
      },
    },
  },

  methods: {
    send(message, data) {
      this.error = null;
      this.busy = message;
      return nodecg
        .sendMessage(message, data)
        .catch((err) => {
          this.error = err.message;
        })
        .finally(() => {
          this.busy = null;
        });
    },

    act(entrant, action) {
      this.send('srlTestEntrant', { name: entrant.name, action });
    },

    setGame(game, abbrev, goal) {
      this.send('srlTestGame', { game, abbrev, goal });
    },

    fetchMatches() {
      if (this.matches.length || this.loadingMatches) return;

      this.loadingMatches = true;
      nodecg
        .sendMessage('srlTestMatches')
        .then((matches) => (this.matches = matches))
        .catch((err) => (this.error = `Couldn't get the matches: ${err.message}`))
        .finally(() => (this.loadingMatches = false));
    },

    fetchGames() {
      if (this.sheetGames.length || this.loadingGames) return;

      this.loadingGames = true;
      nodecg
        .sendMessage('srlTestGames')
        .then((games) => (this.sheetGames = games))
        .catch((err) => (this.error = `Couldn't get the games sheet: ${err.message}`))
        .finally(() => (this.loadingGames = false));
    },

    // the same as the match panels show for them
    entrantIcon(entrant) {
      return {
        Entered: 'mdi-human-handsdown',
        Ready: 'mdi-human-handsup',
        'In Progress': 'mdi-run',
        Finished: 'mdi-flag-checkered',
        Forfeit: 'mdi-cancel',
      }[entrant.state];
    },

    entrantColor(entrant) {
      return { Ready: 'blue', 'In Progress': 'green', Finished: 'primary', Forfeit: 'red' }[entrant.state];
    },

    formatTime(seconds) {
      return formatTimer(seconds * 1000, false, false);
    },
  },

  data() {
    return {
      srlFake: { enabled: false, race: null },
      now: Date.now(),
      ticker: null,
      error: null,
      // the message that's still on its way, for its button's spinner
      busy: null,

      matchIds: [],
      matches: [],
      loadingMatches: false,
      pastId: '',

      sheetGames: [],
      loadingGames: false,
      sheetGame: null,
      gameName: '',
      goal: '',
    };
  },
};
</script>
