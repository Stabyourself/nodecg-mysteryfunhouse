<template>
    <v-item-group>
        <v-container>
            <v-row align="center">
                <v-col
                v-for="image in images"
                :key="image.url"
                >
                    <v-item v-slot="{ active, toggle }">
                        <div class="select-img-wrap">
                            <img
                                class="select-img"
                                :src="image.url"
                                @click="toggle"
                            >
                        </div>
                    </v-item>
                </v-col>
            </v-row>
        </v-container>
    </v-item-group>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    props: [
        "assetName"
    ],

    created() {
        bindReplicant.call(this, "images", "assets:" + this.assetName)
    },

    data() {
        return {
            images: [],
        }
    }
};
</script>