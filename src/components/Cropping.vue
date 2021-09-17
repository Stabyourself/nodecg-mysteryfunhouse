<template>
    <v-app>
        <v-main>
            <v-tabs v-model="tab" centered class="mt-3 mb-3">
                <v-tabs-slider color="primary"></v-tabs-slider>

                <v-tab
                    v-for="i in 4" :key="i"
                >
                    Player {{ i }}
                </v-tab>
            </v-tabs>

            <v-tabs-items v-model="tab">
                <v-tab-item :key="1">
                    <player-cropping :player="1"></player-cropping>
                </v-tab-item>
                <v-tab-item :key="2">
                    <player-cropping :player="2"></player-cropping>
                </v-tab-item>
                <v-tab-item :key="3">
                    <player-cropping :player="3"></player-cropping>
                </v-tab-item>
                <v-tab-item :key="4">
                    <player-cropping :player="4"></player-cropping>
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
        }
    }
};
</script>