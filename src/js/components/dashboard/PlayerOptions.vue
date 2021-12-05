<template>
  <div>
    <v-text-field
      v-model="name"
      class="font-weight-bold"
      :label="`${playerNumber % 2 == 0 ? 'Left' : 'Right'} Player`"
    ></v-text-field>

    <v-combobox
      v-model="pronouns"
      :items="pronounOptions"
      label="Pronouns"
      hint="This is also a free input"
      dense
    ></v-combobox>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-text-field
      v-model="twitch"
      label="Twitch"
      prefix="twitch.tv/"
      dense
    ></v-text-field>

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
          step="5"
          dense
        ></v-text-field>
      </template>
    </v-slider>

    <v-row>
      <v-col>
        <v-btn
          v-if="!streamHidden"
          color="green"
          block
          class="mb-3"
          small
          @click="streamHidden = true"
        >
          Visible
          <v-icon right dark> mdi-eye </v-icon>
        </v-btn>

        <v-btn
          v-else
          color="red"
          block
          class="mb-3"
          small
          @click="streamHidden = false"
        >
          Hidden
          <v-icon right dark> mdi-eye-off </v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <v-btn
          color="primary"
          block
          class="mb-3"
          @click="reloadStream"
          :loading="refreshing"
          small
        >
          Reload
          <v-icon right dark> mdi-refresh </v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-btn
      color="green"
      block
      class="mb-3"
      @click="makeDone"
      :disabled="done || forfeit"
    >
      .done
      <v-icon right dark> mdi-flag-checkered </v-icon>
    </v-btn>

    <v-btn
      color="red"
      block
      class="mb-3"
      @click="makeForfeit"
      :disabled="forfeit || done"
    >
      .forfeit
      <v-icon right dark> mdi-cancel </v-icon>
    </v-btn>

    <v-btn
      color="orange"
      block
      @click="makeUndone"
      :disabled="!done && !forfeit"
    >
      .undone
      <v-icon right dark> mdi-undo </v-icon>
    </v-btn>

    <v-row>
      <v-col>
        <v-switch v-model="done" label="Is done"></v-switch>
      </v-col>
      <v-col>
        <v-switch v-model="forfeit" label="Forfeited"></v-switch>
      </v-col>
    </v-row>

    <v-text-field v-model="finalTime" label="Final time" dense></v-text-field>

    <v-divider class="mb-7 mt-4"></v-divider>

    <v-select
      :items="popovers"
      item-text="base"
      item-value="url"
      v-model="popover"
      label="Popover graphic"
      dense
    >
    </v-select>
    <v-row>
      <v-col cols="3">
        <v-text-field
          label="Duration"
          suffix="s"
          v-model="popoverDuration"
          type="number"
          min="0"
          dense
        >
        </v-text-field>
      </v-col>

      <v-col cols="9">
        <v-btn
          v-if="!popoverVisible"
          @click="showPopover"
          block
          color="primary"
        >
          Activate Popover
        </v-btn>

        <v-btn v-else @click="hidePopover" block color="primary">
          Hide Popover
        </v-btn>
      </v-col>
    </v-row>

    <v-progress-linear
      class="no-transition"
      background-color="primary"
      color="primary darken-4"
      :value="popoverBarValue"
    ></v-progress-linear>
  </div>
</template>

<style lang="scss">
.no-transition .v-progress-linear__background,
.no-transition .v-progress-linear__determinate {
  transition: none !important;
}
</style>

<script>
import { bindReplicant, formatTimer } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "name", this.makeName("name"));
    bindReplicant.call(this, "pronouns", this.makeName("pronouns"));

    bindReplicant.call(this, "twitch", this.makeName("twitch"));
    // bindReplicant.call(this, "qualities", this.makeName("qualities"))
    //bindReplicant.call(this, "quality", this.makeName("quality"))
    bindReplicant.call(this, "volume", this.makeName("volume"));
    bindReplicant.call(this, "streamHidden", this.makeName("streamHidden"), 0);

    bindReplicant.call(this, "done", this.makeName("done"), 0);
    bindReplicant.call(this, "forfeit", this.makeName("forfeit"), 0);
    bindReplicant.call(this, "finalTime", this.makeName("finalTime"), 0);

    bindReplicant.call(this, "popovers", "assets:popovers");
    bindReplicant.call(this, "popover", this.makeName("popover"), 0);
    bindReplicant.call(
      this,
      "popoverDuration",
      this.makeName("popoverDuration")
    );
    bindReplicant.call(
      this,
      "popoverVisible",
      this.makeName("popoverVisible"),
      0
    );
  },

  methods: {
    makeName(name) {
      return "player" + this.playerNumber + name;
    },

    makeDone() {
      this.done = true;
      this.forfeit = false;

      nodecg.readReplicant("timer", (timer) => {
        this.finalTime = formatTimer(timer.ms, false, false);
      });

      nodecg.sendMessage("playerStatusChanged", this.playerNumber);
    },

    makeForfeit() {
      this.done = false;
      this.forfeit = true;

      nodecg.readReplicant("timer", (timer) => {
        this.finalTime = formatTimer(timer.ms, false, false);
      });

      nodecg.sendMessage("playerStatusChanged", this.playerNumber);
    },

    makeUndone() {
      this.done = false;
      this.forfeit = false;
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

  props: ["player-number"],

  data() {
    return {
      name: "",
      pronouns: "",

      twitch: "",
      // qualities: [],
      //quality: null,
      volume: 0,
      streamHidden: false,
      refreshing: false,

      done: false,
      forfeit: false,
      finalTime: "",

      pronounOptions: ["", "He/Him", "She/Her", "They/Them"],
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
