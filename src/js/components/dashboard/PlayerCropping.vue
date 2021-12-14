<template>
  <div>
    <div class="crop-wrapper">
      <div v-if="assistantActive">
        <twitch-player
          :playerNumber="1"
          :url="url"
          :volume="0"
          :width="930"
          :height="698"
        ></twitch-player>

        <twitch-player
          style="
            position: absolute;
            top: 0px;
            left: 945px;
            width: 930px;
            height: 698px;
          "
          class="checkerboard"
          :aspectratio="aspectratio"
          :playerNumber="1"
          :volume="0"
          :url="url"
          :crop="crop"
          :width="930"
          :height="698"
        ></twitch-player>

        <div
          v-if="!interacting"
          style="
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0px;
            left: 0px;
          "
        ></div>

        <div
          v-if="!interacting"
          class="nudge-holder"
          style="position: absolute"
          :style="{
            left: crop[0] + 'px',
            top: crop[2] + 'px',
            width: 930 - crop[0] - crop[1] + 'px',
            height: 698 - crop[2] - crop[3] + 'px',
          }"
        >
          <div class="move-arrows" style="left: -48px; top: 50%">
            <v-btn @mousedown="nudgeCrop(0, -1)" x-small outlined dark>
              <v-icon color="primary">mdi-arrow-left</v-icon>
            </v-btn>
            <v-btn @mousedown="nudgeCrop(0, 1)" x-small outlined dark>
              <v-icon color="primary">mdi-arrow-right</v-icon>
            </v-btn>
          </div>

          <div class="move-arrows" style="right: -60px; top: 50%">
            <v-btn @mousedown="nudgeCrop(1, 1)" x-small outlined dark>
              <v-icon color="primary">mdi-arrow-left</v-icon>
            </v-btn>
            <v-btn @mousedown="nudgeCrop(1, -1)" x-small outlined dark>
              <v-icon color="primary">mdi-arrow-right</v-icon>
            </v-btn>
          </div>

          <div class="move-arrows" style="left: 50%; top: -40px">
            <div>
              <v-btn @mousedown="nudgeCrop(2, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-up</v-icon>
              </v-btn>
            </div>
            <div>
              <v-btn @mousedown="nudgeCrop(2, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-down</v-icon>
              </v-btn>
            </div>
          </div>

          <div class="move-arrows" style="left: 50%; bottom: -49px">
            <div>
              <v-btn @mousedown="nudgeCrop(3, 1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-up</v-icon>
              </v-btn>
            </div>
            <div>
              <v-btn @mousedown="nudgeCrop(3, -1)" x-small outlined dark>
                <v-icon color="primary">mdi-arrow-down</v-icon>
              </v-btn>
            </div>
          </div>
        </div>

        <vue-drag-resize
          v-if="!interacting"
          :parentW="930"
          :parentH="698"
          :isActive="true"
          :preventActiveBehavior="true"
          :isDraggable="true"
          :parentLimitation="true"
          :x="crop[0]"
          :y="crop[2]"
          :w="930 - crop[0] - crop[1]"
          :h="698 - crop[2] - crop[3]"
          ref="cropper"
          @resizing="cropChanged"
          @dragging="cropChanged"
        >
        </vue-drag-resize>
      </div>

      <div
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 698px;
        "
      >
        <v-btn
          v-if="!assistantActive"
          color="green"
          @click="assistantActive = true"
        >
          Start cropping
          <v-icon right dark> mdi-arrow-right </v-icon>
        </v-btn>
      </div>
    </div>

    <div class="crop-input-holder">
      <v-text-field
        class="crop-input"
        v-model.number="crop[0]"
        label="Left"
        type="number"
        prepend-inner-icon="mdi-arrow-left"
        min="0"
        max="930"
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[1]"
        label="Right"
        type="number"
        prepend-inner-icon="mdi-arrow-right"
        min="0"
        max="930"
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[2]"
        label="Top"
        type="number"
        prepend-inner-icon="mdi-arrow-up"
        min="0"
        max="698"
      ></v-text-field>

      <v-text-field
        class="crop-input"
        v-model.number="crop[3]"
        label="Bottom"
        type="number"
        prepend-inner-icon="mdi-arrow-down"
        min="0"
        max="698"
      ></v-text-field>

      <v-col cols="3">
        <v-text-field
          v-model.number="cropConcat"
          label="Same but for copypaste :)"
          @click="$event.target.select()"
        ></v-text-field>
      </v-col>

      <v-col>
        <v-btn
          style="width: 192px"
          :color="assistantActive ? 'red' : 'green'"
          block
          @click="assistantActive = !assistantActive"
        >
          {{ assistantActive ? "Finish Cropping" : "Start Cropping" }}
          <v-icon right dark> mdi-arrow-right </v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <v-btn color="red" block @click="resetCrop">
          Reset
          <v-icon right dark> mdi-refresh </v-icon>
        </v-btn>
      </v-col>

      <v-col v-if="assistantActive">
        <v-btn color="red" block @click="interacting = !interacting">
          {{ interacting ? "Stop Interacting" : "Interact" }}
          <v-icon right dark> mdi-cursor-default-click </v-icon>
        </v-btn>
      </v-col>
    </div>
  </div>
</template>

<style lang="scss">
.crop-input-holder {
  max-width: 930px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-wrapper {
  width: 1875px;
  height: 698px;
  margin: 54px auto;
  position: relative;
}

.crop-input.v-input {
  flex: 0 0 100px;
  padding-right: 15px;
}

.move-arrows {
  position: absolute;
  margin-top: -12px;
  margin-left: -12px;

  button,
  button .v-btn__content {
    min-width: auto !important;
    padding: 0 !important;
  }
}
</style>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "crop", `player${this.player}crop`);
    bindReplicant.call(this, "url", `player${this.player}twitch`);
    bindReplicant.call(this, "aspectratio", `player${this.player}aspectratio`);
  },

  props: ["player"],

  watch: {
    crop() {
      if (this.$refs.cropper) {
        this.$refs.cropper.setPosition(
          this.crop[0],
          this.crop[1],
          this.crop[2],
          this.crop[3]
        );
      }
    },
  },

  computed: {
    cropConcat: {
      get() {
        return `[${this.crop.join(",")}]`;
      },

      set(newValue) {
        let parts = newValue.slice(1, -1).split(",");
        for (let i = 0; i < 4; i++) {
          this.$set(this.crop, i, parseInt(parts[i]));
        }
      },
    },
  },

  methods: {
    resetCrop() {
      this.crop = [0, 0, 0, 0];
    },

    cropChanged(coordinates) {
      this.$set(this.crop, 0, coordinates.left);
      this.$set(this.crop, 1, coordinates.right);
      this.$set(this.crop, 2, coordinates.top);
      this.$set(this.crop, 3, coordinates.bottom);
    },

    nudgeCrop(i, diff) {
      let val = this.crop[i] + diff;
      if (i < 2) {
        val = Math.max(0, Math.min(930, val));
      } else {
        val = Math.max(0, Math.min(698, val));
      }

      this.$set(this.crop, i, val);
    },
  },

  data() {
    return {
      crop: [0, 0, 0, 0],
      url: "",
      assistantActive: false,
      interacting: false,
      aspectratio: false,
    };
  },
};
</script>
