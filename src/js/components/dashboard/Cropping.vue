<template>
  <v-app>
    <v-main>
      <v-tabs v-model="tab" centered background-color="transparent">
        <v-tabs-slider color="primary"></v-tabs-slider>

        <v-tab v-for="i in 4" :key="i"> Player {{ i }} </v-tab>
      </v-tabs>

      <v-tabs-items v-model="tab">
        <v-tab-item v-for="i in 4" :key="i">
          <player-cropping :player="i - 1"></player-cropping>
        </v-tab-item>
      </v-tabs-items>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      tab: 0,
    };
  },
};
</script>
