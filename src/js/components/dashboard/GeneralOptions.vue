<template>
  <v-app>
    <v-main>
      <v-container>
        <v-btn
          color="primary"
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

        <div>
          <h2>Player Card Status</h2>

          <a href="#" nodecg-dialog="player-card-preview-dialog">Preview</a>

          <ul>
            <li v-for="(player, i) of playerInfo" :key="player.name">
              Player {{ i + 1 }}:
              <strong>{{ player.name }}</strong>
              <v-tooltip location="top" v-if="!player.career">
                <template v-slot:activator="{ props }">
                  <v-icon color="warning" icon="mdi-alert" v-bind="props"></v-icon>
                </template>
                <span
                  >No career info! (This is normal for new participants)</span
                >
              </v-tooltip>
            </li>
          </ul>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js";

export default {
  created() {
    bindReplicant.call(this, "waitScreenState", "waitScreenState", 0);
    bindReplicant.call(this, "topText");
    bindReplicant.call(this, "playerInfo");
    bindReplicant.call(this, "currentEventLogo");

    bindReplicant.call(this, "eventLogo", "assets:eventLogo");
  },

  data() {
    return {
      waitScreenState: false,
      playerInfo: [],
      topText: "",
      currentEventLogo: {},
    };
  },
};
</script>
