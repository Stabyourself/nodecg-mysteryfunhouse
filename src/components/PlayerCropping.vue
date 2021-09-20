<template>
    <div>
        <div class="crop-wrapper">
            <div v-if="assistantActive">
                <twitch-player
                    :playerNumber="1"
                    :url="url"
                    :volume="0"
                ></twitch-player>

                <div style="width: 930px; height:698px; position: absolute; top: 0px; left: 0px;"></div>

                <vue-drag-resize
                    :parentW="930"
                    :parentH="698"
                    :isActive="true"
                    :preventActiveBehavior="true"
                    :isDraggable="true"
                    :parentLimitation="true"
                    :x="crop[0]"
                    :y="crop[2]"
                    :w="930-crop[0]-crop[1]"
                    :h="698-crop[2]-crop[3]"
                    ref="cropper"
                    @resizing="cropChanged"
                    @dragging="cropChanged"
                ></vue-drag-resize>
            </div>

            <div style="display: flex; align-items: center; justify-content: center; height: 698px">
                <v-btn v-if="!assistantActive" color="green" elevation="2" @click="assistantActive = true">
                    Start cropping
                    <v-icon right dark>
                        mdi-arrow-right
                    </v-icon>
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
                <v-btn :color="assistantActive?'red':'green'" elevation="2" block @click="assistantActive = !assistantActive">
                    {{ assistantActive?"Finish Cropping":"Start Cropping" }}
                    <v-icon right dark>
                        mdi-arrow-right
                    </v-icon>
                </v-btn>
            </v-col>

            <v-col>
                <v-btn color="red" elevation="2" block @click="resetCrop">
                    Reset
                    <v-icon right dark>
                        mdi-refresh
                    </v-icon>
                </v-btn>
            </v-col>
        </div>
    </div>
</template>

<style scoped>
    .crop-input-holder {
        max-width: 930px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .crop-wrapper {
        width: 930px;
        height:698px;
        margin: 3px auto;
        position: relative;
    }

    .crop-input.v-input {
        flex: 0 0 100px;
        padding-right: 15px;
    }
</style>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "crop", `player${this.player}crop`, 100)
        bindReplicant.call(this, "url", `player${this.player}twitch`, 0)
    },

    props: [
        "player",
    ],

    watch: {
        crop() {
            if (this.$refs.cropper) {
                this.$refs.cropper.setPosition(this.crop[0], this.crop[1], this.crop[2], this.crop[3])
            }
        }
    },

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

    methods: {
        resetCrop() {
            this.crop = [0, 0, 0, 0]
        },

        cropChanged(coordinates) {
            this.$set(this.crop, 0, coordinates.left)
            this.$set(this.crop, 1, coordinates.right)
            this.$set(this.crop, 2, coordinates.top)
            this.$set(this.crop, 3, coordinates.bottom)
        },
    },

    data() {
        return {
            crop: [0, 0, 0, 0],
            url: "",
            assistantActive: false,
        }
    }
};
</script>