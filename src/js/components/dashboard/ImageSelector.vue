<template>
  <v-item-group
    :key="itemGroup"
    v-model="selected"
    @update:model-value="select"
  >
    <v-container fluid>
      <v-row class="align-center">
        <v-col v-for="image in imagesReversed" :key="image.url">
          <v-item v-slot="{ isSelected, toggle }">
            <div class="select-img-wrap" :class="{ active: isSelected }" @click="toggle">
              <img
                :class="{ active: isSelected }"
                class="select-img"
                :src="image.url"
              />
              <div class="select-img-border"></div>
            </div>
          </v-item>
        </v-col>
      </v-row>
    </v-container>
  </v-item-group>
</template>

<script>
import { bindReplicant } from "../../util.js";

export default {
  props: ["assetName", "destinationReplicant"],

  created() {
    bindReplicant.call(this, "images", "assets:" + this.assetName);
    bindReplicant.call(this, "value", this.destinationReplicant, 0);
  },

  watch: {
    images() {
      this.updateSelection();
    },

    value() {
      this.updateSelection();
    },
  },

  computed: {
    // newest first. a copy, the list itself belongs to the assets replicant
    imagesReversed() {
      return [...this.images].reverse();
    },
  },

  methods: {
    select() {
      this.value = this.imagesReversed[this.selected];
    },

    updateSelection() {
      this.itemGroup++; // vuetify bug workaround

      if (this.value != null) {
        for (let [i, image] of this.imagesReversed.entries()) {
          if (image.url == this.value.url) {
            this.selected = i;
            return;
          }
        }
      }

      this.selected = null;
    },
  },

  data() {
    return {
      images: [],
      selected: null,
      value: "",
      itemGroup: 0,
    };
  },
};
</script>
