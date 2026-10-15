<template>
  <div>
    <v-text-field
      v-model="name"
      class="font-weight-bold"
      :label="`${playerNumber % 2 == 0 ? 'Left' : 'Right'} Player`"></v-text-field>

    <v-combobox
      v-model="pronouns"
      :items="pronounOptions"
      label="Pronouns"
      hint="This is also a free input"></v-combobox>

    <v-text-field v-model="flag" class="font-weight-bold" label="Flag"></v-text-field>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-row>
      <v-col cols="7">
        <v-text-field v-model="twitch" label="Twitch" prefix="twitch.tv/" density="compact"></v-text-field>
      </v-col>
      <v-col cols="5">
        <v-text-field v-model="srl" label="SRL" density="compact"></v-text-field>
      </v-col>
    </v-row>

    <!--
        <v-select
            label="Quality"
            v-model="quality"
            :items="qualities"
            item-title="name"
            item-value="group"
        ></v-select>
        -->

    <v-row>
      <v-col>
        <v-btn
          v-if="!streamHidden"
          color="green"
          block
          class="mb-3"
          size="small"
          append-icon="mdi-eye"
          @click="streamHidden = true">
          Visible
        </v-btn>

        <v-btn v-else color="red" block class="mb-3" size="small" append-icon="mdi-eye-off" @click="streamHidden = false">
          Hidden
        </v-btn>
      </v-col>

      <v-col>
        <v-btn
          color="primary"
          block
          class="mb-3"
          size="small"
          append-icon="mdi-refresh"
          :loading="refreshing"
          @click="reloadStream">
          Reload
        </v-btn>
      </v-col>
    </v-row>

    <v-combobox :items="aspectratioOptions" item-title="text" v-model="aspectratio" label="Force Aspect Ratio">
    </v-combobox>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-btn
      color="green"
      block
      class="mb-3"
      append-icon="mdi-flag-checkered"
      :disabled="raceState != 'none'"
      @click="makeDone">
      .done
    </v-btn>

    <v-btn
      color="red"
      block
      class="mb-3"
      append-icon="mdi-cancel"
      :disabled="raceState != 'none'"
      @click="makeForfeit">
      .forfeit
    </v-btn>

    <v-btn color="orange" block append-icon="mdi-undo" :disabled="raceState == 'none'" @click="makeUndone">
      .undone
    </v-btn>

    <div v-if="srlRace.race" class="srl-line mt-3">
      <v-icon size="small" :color="srlLine.color" :icon="srlLine.icon"></v-icon>
      <span :title="srlLine.text">{{ srlLine.text }}</span>
    </div>

    <v-row class="mt-3">
      <v-col cols="6">
        <v-select
          v-model="raceState"
          :items="raceStateOptions"
          item-title="text"
          label="State"
          density="compact"></v-select>
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="finalTime" density="compact" label="Final time"></v-text-field>
      </v-col>
    </v-row>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-select
      :items="popovers"
      item-title="base"
      item-value="url"
      v-model="popover"
      label="Popover graphic"
      density="compact">
    </v-select>
    <v-row>
      <v-col cols="3">
        <v-text-field label="Duration" suffix="s" v-model="popoverDuration" type="number" min="0" density="compact">
        </v-text-field>
      </v-col>

      <v-col cols="9">
        <v-btn v-if="!popoverVisible" @click="showPopover" block color="primary"> Activate Popover </v-btn>

        <v-btn v-else @click="hidePopover" block color="primary"> Hide Popover </v-btn>
      </v-col>
    </v-row>

    <v-progress-linear
      class="no-transition"
      bg-color="primary"
      color="primary-darken-4"
      :model-value="popoverBarValue"></v-progress-linear>
  </div>
</template>

<style lang="scss">
.srl-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;

  span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.no-transition .v-progress-linear__background,
.no-transition .v-progress-linear__determinate {
  transition: none !important;
}
</style>

<script>
import { bindReplicant, formatTimer } from '../../util.js';

export default {
  created() {
    bindReplicant.call(this, 'name', this.makeName('name'));
    bindReplicant.call(this, 'pronouns', this.makeName('pronouns'));
    bindReplicant.call(this, 'flag', this.makeName('flag'));

    bindReplicant.call(this, 'twitch', this.makeName('twitch'));
    bindReplicant.call(this, 'srl', this.makeName('srl'));
    bindReplicant.call(this, 'srlRace');
    // bindReplicant.call(this, "qualities", this.makeName("qualities"))
    //bindReplicant.call(this, "quality", this.makeName("quality"))
    bindReplicant.call(this, 'streamHidden', this.makeName('streamHidden'), 0);
    bindReplicant.call(this, 'aspectratioRep', this.makeName('aspectratio'));

    bindReplicant.call(this, 'raceState', this.makeName('raceState'), 0);
    bindReplicant.call(this, 'finalTime', this.makeName('finalTime'), 0);

    bindReplicant.call(this, 'popovers', 'assets:popovers');
    bindReplicant.call(this, 'popover', this.makeName('popover'), 0);
    bindReplicant.call(this, 'popoverDuration', this.makeName('popoverDuration'));
    bindReplicant.call(this, 'popoverVisible', this.makeName('popoverVisible'), 0);
    this.updateAspectRatioField();
  },

  computed: {
    srlEntrant() {
      return this.srlRace.slots[this.playerNumber] ?? null;
    },

    // "done", "forfeit" or null
    srlResult() {
      const state = this.srlEntrant?.state;
      if (state == 'Finished') return 'done';
      if (state == 'Forfeit' || state == 'Disqualified') return 'forfeit';
      return null;
    },

    srlLine() {
      const entrant = this.srlEntrant;

      if (!entrant) {
        return { icon: 'mdi-help-circle-outline', color: 'grey', text: 'Not in the SRL race' };
      }

      const who = `SRL ${entrant.displayname}`;

      if (this.srlResult == 'done') {
        const time = entrant.time > 0 ? ` ${formatTimer(entrant.time * 1000, false, false)}` : '';
        return { icon: 'mdi-flag-checkered', color: 'green', text: `${who}: finished${time}` };
      }
      if (this.srlResult == 'forfeit') {
        return { icon: 'mdi-cancel', color: 'red', text: `${who}: ${entrant.state.toLowerCase()}` };
      }

      const text = `${who}: ${entrant.state.toLowerCase()}`;

      // joined, but not .ready yet: just standing there
      if (entrant.state == 'Entered') return { icon: 'mdi-human-handsdown', color: 'grey', text };
      if (entrant.state == 'Ready') return { icon: 'mdi-human-handsup', color: 'blue', text };

      return { icon: 'mdi-run', color: 'blue', text };
    },
  },

  watch: {
    aspectratio() {
      // picking an option gives the option, typing something gives the text. clearing the
      // field gives null, which is "auto" as well
      const value =
        this.aspectratio && typeof this.aspectratio == 'object' ? this.aspectratio.value : this.aspectratio;

      this.aspectratioRep = value || false;
    },

    aspectratioRep() {
      this.updateAspectRatioField();
    },
  },

  methods: {
    updateAspectRatioField() {
      // the option if there is one for this value, otherwise the value as it was typed
      const option = this.aspectratioOptions.find((x) => x.value == this.aspectratioRep);

      this.aspectratio = option ?? this.aspectratioRep;
    },

    makeName(name) {
      return 'player' + this.playerNumber + name;
    },

    makeDone() {
      nodecg.readReplicant('timer', (timer) => {
        this.finalTime = formatTimer(timer.ms, false, false);
      });

      nodecg.sendMessage('playerRaceStateChanged', {
        player: this.playerNumber,
        state: 'done',
      });
    },

    makeForfeit() {
      nodecg.readReplicant('timer', (timer) => {
        this.finalTime = formatTimer(timer.ms, false, false);
      });

      nodecg.sendMessage('playerRaceStateChanged', {
        player: this.playerNumber,
        state: 'forfeit',
      });
    },

    makeUndone() {
      nodecg.sendMessage('playerRaceStateChanged', {
        player: this.playerNumber,
        state: 'none',
      });
    },

    reloadStream() {
      nodecg.sendMessage(`stream${this.playerNumber}reload`);
      this.refreshing = true;

      setTimeout(() => {
        this.refreshing = false;
      }, 500);
    },

    showPopover() {
      this.popoverVisible = true;

      let duration = parseInt(this.popoverDuration * 1000);

      if (duration) {
        this.popoverTime = new Date();
        this.updatePopoverBar();

        this.popoverTimeout = setTimeout(() => {
          this.popoverVisible = false;
          this.popoverBarValue = 100;
        }, duration);

        if (this.popover && this.popover.includes('player-dead')) {
          nodecg.sendMessage('playSound', {
            sound: 'Player Dead',
          });
        }
      }
    },

    hidePopover() {
      this.popoverVisible = false;
      this.popoverBarValue = 100;

      if (this.popoverTimeout) {
        clearTimeout(this.popoverTimeout);
      }
    },

    updatePopoverBar() {
      if (this.popoverVisible) {
        let diff = new Date() - this.popoverTime;

        if (diff < this.popoverDuration * 1000) {
          requestAnimationFrame(this.updatePopoverBar);
        }

        this.popoverBarValue = (diff / (this.popoverDuration * 1000)) * 100;
      }
    },
  },

  props: ['player-number'],

  data() {
    return {
      name: '',
      pronouns: '',
      flag: '',

      twitch: '',
      srl: '',
      srlRace: { race: null, slots: [null, null, null, null], polled: 0, error: null },
      // qualities: [],
      //quality: null,
      streamHidden: false,
      refreshing: false,
      aspectratio: false,

      raceState: 'none',
      finalTime: '',

      pronounOptions: ['', 'He/Him', 'She/Her', 'They/Them'],
      aspectratioOptions: [
        {
          text: 'Auto',
          value: false,
        },
        {
          text: '4:3',
          value: '4:3',
        },
        {
          text: '16:9',
          value: '16:9',
        },
        {
          text: '1:1',
          value: '1:1',
        },
        {
          text: '4:6 (Tate)',
          value: '4:6',
        },
        {
          text: '10:9 (GB, GBC, GG)',
          value: '10:9',
        },
        {
          text: '3:2 (GBA)',
          value: '3:2',
        },
        {
          text: '12:7 (VB)',
          value: '12:7',
        },
        {
          text: '30:17 (PSP)',
          value: '30:17',
        },
      ],
      raceStateOptions: [
        {
          text: 'None',
          value: 'none',
        },
        {
          text: '1st Place',
          value: 'winner',
        },
        {
          text: '2nd Place',
          value: 'loser',
        },
        {
          text: 'Forfeit',
          value: 'forfeit',
        },
      ],
      aspectratioRep: false,
      popover: null,
      popoverDuration: 3,
      popovers: [],
      popoverVisible: false,
      popoverTimeout: null,
      popoverTime: null,
      popoverBarValue: 100,
    };
  },
};
</script>
