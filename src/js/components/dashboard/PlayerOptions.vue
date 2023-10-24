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

    <v-text-field v-model="twitch" label="Twitch" prefix="twitch.tv/" dense></v-text-field>

    <!--
        <v-select
            label="Quality"
            v-model="quality"
            :items="qualities"
            item-text="name"
            item-value="group"
        ></v-select>
        -->

    <v-slider v-model="volume" label="Volume" min="0" max="100">
      <template v-slot:append>
        <v-text-field
          v-model="volume"
          class="mt-0 pt-0"
          type="number"
          style="width: 45px"
          min="0"
          max="100"
          step="1"
          dense></v-text-field>
      </template>
    </v-slider>

    <v-row>
      <v-col>
        <v-btn v-if="!streamHidden" color="green" block class="mb-3" small @click="streamHidden = true">
          Visible
          <v-icon right dark> mdi-eye </v-icon>
        </v-btn>

        <v-btn v-else color="red" block class="mb-3" small @click="streamHidden = false">
          Hidden
          <v-icon right dark> mdi-eye-off </v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <v-btn color="primary" block class="mb-3" @click="reloadStream" :loading="refreshing" small>
          Reload
          <v-icon right dark> mdi-refresh </v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-combobox :items="aspectratioOptions" v-model="aspectratio" label="Force Aspect Ratio"> </v-combobox>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-btn color="green" block class="mb-3" @click="makeDone" :disabled="raceState != 'none'">
      .done
      <v-icon right dark> mdi-flag-checkered </v-icon>
    </v-btn>

    <v-btn color="red" block class="mb-3" @click="makeForfeit" :disabled="raceState != 'none'">
      .forfeit
      <v-icon right dark> mdi-cancel </v-icon>
    </v-btn>

    <v-btn color="orange" block @click="makeUndone" :disabled="raceState == 'none'">
      .undone
      <v-icon right dark> mdi-undo </v-icon>
    </v-btn>

    <v-row class="mt-3">
      <v-col cols="6">
        <v-select v-model="raceState" :items="raceStateOptions" label="State" dense></v-select>
      </v-col>
      <v-col cols="6">
        <v-text-field v-model="finalTime" dense label="Final time"></v-text-field>
      </v-col>
    </v-row>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-select :items="popovers" item-text="base" item-value="url" v-model="popover" label="Popover graphic" dense>
    </v-select>
    <v-row>
      <v-col cols="3">
        <v-text-field label="Duration" suffix="s" v-model="popoverDuration" type="number" min="0" dense> </v-text-field>
      </v-col>

      <v-col cols="9">
        <v-btn v-if="!popoverVisible" @click="showPopover" block color="primary"> Activate Popover </v-btn>

        <v-btn v-else @click="hidePopover" block color="primary"> Hide Popover </v-btn>
      </v-col>
    </v-row>

    <v-progress-linear
      class="no-transition"
      background-color="primary"
      color="primary darken-4"
      :value="popoverBarValue"></v-progress-linear>
  </div>
</template>

<style lang="scss">
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
    // bindReplicant.call(this, "qualities", this.makeName("qualities"))
    //bindReplicant.call(this, "quality", this.makeName("quality"))
    bindReplicant.call(this, 'volume', this.makeName('volume'));
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

  watch: {
    aspectratio() {
      this.aspectratioRep = typeof this.aspectratio == 'object' ? this.aspectratio.value : this.aspectratio;
    },

    aspectratioRep() {
      this.updateAspectRatioField();
    },
  },

  methods: {
    updateAspectRatioField() {
      this.aspectratio = this.aspectratioOptions.find((x) => x.value == this.aspectratioRep);

      if (typeof this.aspectratio != 'object' && this.aspectradio !== false) {
        this.aspectratio = this.aspectratioRep;
      }
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

        if (this.popover.search('player-dead') != -1) {
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
      // qualities: [],
      //quality: null,
      volume: 0,
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
