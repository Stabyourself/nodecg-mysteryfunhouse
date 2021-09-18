<template>
    <div style="text-align: center">
        <v-row class="crop-input-holder">
            <v-col v-for="(input, i) in inputs" :key="i" cols="3">
                <v-text-field
                    v-model.number="crop[i]"
                    :label="input"
                    type="number"
                ></v-text-field>
            </v-col>

            <v-col>
                <v-text-field
                    v-model.number="cropConcat"
                    label="For copypaste :)"
                    @click="$event.target.select()"
                ></v-text-field>
            </v-col>
        </v-row>
    </div>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "crop", `player${this.player}crop`, 0)
    },

    props: [
        "player",
    ],

    computed: {
        cropConcat: {
            get() {
                return `[${this.crop.join(",")}]`
            },

            set(newValue) {
                let parts = newValue.slice(1, -1).split(",")
                for (let i = 0; i < 4; i++) {
                    this.$set(this.crop, i, parseInt(parts[i]))
                }
            }
        }
    },

    data() {
        return {
            crop: [0, 0, 930, 698],
            inputs: [
                "left",
                "top",
                "width",
                "height"
            ]
        }
    }
};
</script>