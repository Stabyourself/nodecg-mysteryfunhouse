<template>
    <v-app>
        <!-- <video width="1920" autoplay loop muted>
            <source src="video/waiting_screen_back.mp4">
        </video> -->
        <ghost-background></ghost-background>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    mounted() {
        bindReplicant.call(this, "racerCardInfo")
    },

    data() {
        return {
            racerCardInfo: null
        }
    }
};
</script>