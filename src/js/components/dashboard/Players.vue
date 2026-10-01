<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="eventId"
              :items="events"
              item-title="name"
              item-value="id"
              label="Event"
              :loading="loadingEvents"
              :hint="selectedEvent ? `Challonge tournament: ${selectedEvent.challongeTournament}` : 'No Challonge tournament configured for this event'"
              persistent-hint></v-select>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <v-row class="align-center">
          <v-col cols="auto">
            <v-btn color="primary" append-icon="mdi-plus" @click="openAddDialog">Add Player</v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn append-icon="mdi-refresh" @click="fetchPlayers" :loading="loading">Refresh</v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn append-icon="mdi-shield-search" @click="checkIntegrity" :loading="checkingIntegrity">
              Check Challonge Integrity
            </v-btn>
          </v-col>

          <v-col cols="auto">
            <v-btn append-icon="mdi-auto-fix" @click="autofillMissingData" :loading="autofilling">
              Autofill From Past Tournaments
            </v-btn>
          </v-col>

          <v-col>
            <span v-if="error" class="text-error">{{ error }}</span>
            <span v-else-if="autofillSummary">{{ autofillSummary }}</span>
            <span v-else-if="integritySummary">{{ integritySummary }}</span>
          </v-col>
        </v-row>

        <v-data-table
          :headers="headers"
          :items="tableItems"
          :loading="loading"
          :row-props="rowProps"
          item-value="signupId"
          density="compact">
          <template v-slot:item.username="{ item }">
            <v-chip v-if="isFieldMissing(item, 'username')" size="x-small" color="error" variant="flat">missing</v-chip>
            <span v-else>{{ item.username }}</span>
          </template>

          <template v-slot:item.challongeUsername="{ item }">
            <v-chip v-if="isFieldMissing(item, 'challongeUsername')" size="x-small" color="error" variant="flat">
              missing
            </v-chip>
            <span v-else>{{ item.challongeUsername }}</span>
          </template>

          <template v-slot:item.twitch="{ item }">
            <v-chip v-if="isFieldMissing(item, 'twitch')" size="x-small" color="error" variant="flat">missing</v-chip>
            <span v-else>{{ item.twitch }}</span>
          </template>

          <template v-slot:item.discordId="{ item }">
            <v-chip v-if="isFieldMissing(item, 'discordId')" size="x-small" color="error" variant="flat">missing</v-chip>
            <span v-else>{{ item.discordId }}</span>
          </template>

          <template v-slot:item.actions="{ item }">
            <template v-if="item.ghost">
              <v-icon size="16" icon="mdi-plus" @click="openAddDialogFromGhost(item)"></v-icon>
            </template>
            <template v-else>
              <v-icon size="16" class="mr-2" icon="mdi-pencil" @click="openEditDialog(item)"></v-icon>
              <v-icon size="16" icon="mdi-delete" @click="removePlayer(item)"></v-icon>
            </template>
          </template>
        </v-data-table>
      </v-container>

      <v-dialog v-model="dialog" max-width="500">
        <v-card>
          <v-card-title>{{ editing ? 'Edit Player' : 'Add Player' }}</v-card-title>

          <v-card-text>
            <v-text-field
              v-model="form.discordId"
              label="Discord ID"
              :disabled="editing"
              hint="Needed to look up their Discord avatar/name"
              persistent-hint></v-text-field>
            <v-text-field v-model="form.username" label="Display Name"></v-text-field>
            <v-text-field v-model="form.challongeUsername" label="Challonge Username"></v-text-field>
            <v-text-field v-model="form.twitch" label="Twitch" prefix="twitch.tv/"></v-text-field>
            <v-text-field v-model="form.pronouns" label="Pronouns"></v-text-field>
            <v-text-field v-model="form.flag" label="Flag"></v-text-field>
            <v-text-field v-model="form.flavor" label="Flavor text"></v-text-field>

            <span v-if="formError" class="text-error">{{ formError }}</span>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
            <v-btn color="primary" variant="elevated" @click="savePlayer" :loading="saving">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<style lang="scss">
.integrity-ghost-row {
  background-color: rgba(255, 82, 82, 0.15);
}
</style>

<script>
import { bindReplicant } from '../../util.js';

export default {
  created() {
    bindReplicant.call(this, 'eventId', 'signupEventId');

    this.fetchEvents();
    this.fetchPlayers();
  },

  watch: {
    eventId() {
      this.fetchPlayers();
    },
  },

  computed: {
    selectedEvent() {
      return this.events.find((event) => event.id === this.eventId);
    },

    tableItems() {
      return [...this.players, ...this.ghostPlayers];
    },
  },

  methods: {
    fetchEvents() {
      this.loadingEvents = true;

      nodecg
        .sendMessage('getEvents')
        .then((events) => {
          this.events = events;
          this.loadingEvents = false;
        })
        .catch((err) => {
          this.error = err.message;
          this.loadingEvents = false;
        });
    },

    fetchPlayers() {
      this.loading = true;
      this.error = null;
      this.resetIntegrity();
      this.autofillSummary = null;

      // The event select writes to its replicant on a debounce, so a request fired right
      // after switching events must carry the event id explicitly rather than rely on the
      // server's (not-yet-updated) replicant value. Guard against a slower, now-stale
      // response landing after a later switch has already moved `this.eventId` on.
      const requestedEventId = this.eventId;

      nodecg
        .sendMessage('getPlayers', { eventId: requestedEventId })
        .then((players) => {
          this.loading = false;
          if (requestedEventId !== this.eventId) return;
          this.players = players;
        })
        .catch((err) => {
          this.loading = false;
          if (requestedEventId !== this.eventId) return;
          this.error = err.message;
        });
    },

    resetIntegrity() {
      this.ghostPlayers = [];
      this.missingFieldsBySignupId = {};
      this.integritySummary = null;
    },

    checkIntegrity() {
      this.checkingIntegrity = true;
      this.error = null;
      this.resetIntegrity();

      nodecg
        .sendMessage('getChallongeParticipants', { eventId: this.eventId })
        .then((participantNames) => {
          const matchedSignupIds = new Set();
          const ghostPlayers = [];
          const missingFieldsBySignupId = {};

          for (const name of participantNames) {
            const player = this.players.find(
              (p) =>
                !matchedSignupIds.has(p.signupId) &&
                p.challongeUsername &&
                p.challongeUsername.toLowerCase() === name.toLowerCase(),
            );

            if (!player) {
              ghostPlayers.push({
                signupId: `ghost-${name}`,
                discordId: '',
                username: '',
                challongeUsername: name,
                twitch: '',
                pronouns: '',
                flag: '',
                flavor: '',
                ghost: true,
              });
              continue;
            }

            matchedSignupIds.add(player.signupId);

            const missing = ['username', 'challongeUsername', 'twitch', 'discordId'].filter(
              (field) => !player[field],
            );

            if (missing.length > 0) {
              missingFieldsBySignupId[player.signupId] = missing;
            }
          }

          this.ghostPlayers = ghostPlayers;
          this.missingFieldsBySignupId = missingFieldsBySignupId;

          const incompleteCount = Object.keys(missingFieldsBySignupId).length;
          this.integritySummary = `Checked ${participantNames.length} Challonge participants: ${ghostPlayers.length} missing entirely, ${incompleteCount} with incomplete data.`;

          this.checkingIntegrity = false;
        })
        .catch((err) => {
          this.error = err.message;
          this.checkingIntegrity = false;
        });
    },

    autofillMissingData() {
      this.autofilling = true;
      this.error = null;
      this.autofillSummary = null;

      nodecg
        .sendMessage('autofillMissingData', { eventId: this.eventId })
        .then(({ addedPlayers, updatedFields }) => {
          this.autofilling = false;

          this.fetchPlayers();

          const fieldCount = updatedFields.reduce((sum, u) => sum + u.fields.length, 0);
          const parts = [];

          if (addedPlayers.length > 0) {
            parts.push(`added ${addedPlayers.length} player(s) found in past tournaments`);
          }
          if (fieldCount > 0) {
            parts.push(`filled in ${fieldCount} field(s) for ${updatedFields.length} player(s)`);
          }

          this.autofillSummary =
            parts.length === 0
              ? 'No missing data could be filled in from past tournaments.'
              : `Autofill: ${parts.join(', ')} from past tournaments.`;
        })
        .catch((err) => {
          this.autofilling = false;
          this.error = err.message;
        });
    },

    isFieldMissing(item, field) {
      if (item.ghost) {
        // The Challonge username is the one thing we do know about a ghost entry.
        return field !== 'challongeUsername';
      }

      const missingFields = this.missingFieldsBySignupId[item.signupId];
      return missingFields ? missingFields.includes(field) : false;
    },

    rowProps({ item }) {
      return { class: item.ghost ? 'integrity-ghost-row' : '' };
    },

    openAddDialog() {
      this.editing = false;
      this.formError = null;
      this.form = {
        signupId: null,
        discordId: '',
        username: '',
        challongeUsername: '',
        twitch: '',
        pronouns: '',
        flag: '',
        flavor: '',
      };
      this.dialog = true;
    },

    openAddDialogFromGhost(item) {
      this.openAddDialog();
      this.form.challongeUsername = item.challongeUsername;
    },

    openEditDialog(item) {
      this.editing = true;
      this.formError = null;
      this.form = { ...item };
      this.dialog = true;
    },

    savePlayer() {
      if (!this.form.discordId || !this.form.username || !this.form.challongeUsername) {
        this.formError = 'Discord ID, display name and Challonge username are required.';
        return;
      }

      this.saving = true;
      this.formError = null;

      const message = this.editing ? 'updatePlayer' : 'addPlayer';

      nodecg
        .sendMessage(message, { ...this.form, eventId: this.eventId })
        .then(() => {
          this.saving = false;
          this.dialog = false;
          this.fetchPlayers();
        })
        .catch((err) => {
          this.saving = false;
          this.formError = err.message;
        });
    },

    removePlayer(item) {
      if (!confirm(`Remove ${item.username} from this event's roster?`)) {
        return;
      }

      nodecg
        .sendMessage('removePlayer', item.signupId)
        .then(() => {
          this.fetchPlayers();
        })
        .catch((err) => {
          this.error = err.message;
        });
    },
  },

  data() {
    return {
      eventId: 4,
      events: [],
      loadingEvents: false,

      players: [],
      loading: false,
      error: null,

      checkingIntegrity: false,
      ghostPlayers: [],
      missingFieldsBySignupId: {},
      integritySummary: null,

      autofilling: false,
      autofillSummary: null,

      dialog: false,
      editing: false,
      saving: false,
      formError: null,
      form: {},

      headers: [
        { title: 'Name', key: 'username' },
        { title: 'Challonge', key: 'challongeUsername' },
        { title: 'Twitch', key: 'twitch' },
        { title: 'Pronouns', key: 'pronouns' },
        { title: 'Flag', key: 'flag' },
        { title: 'Flavor', key: 'flavor' },
        { title: 'Discord ID', key: 'discordId' },
        { title: '', key: 'actions', sortable: false },
      ],
    };
  },
};
</script>
