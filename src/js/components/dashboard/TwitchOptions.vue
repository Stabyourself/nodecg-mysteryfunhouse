<template>
    <v-app>
        <v-main>
            <v-container>
                <v-btn
                    class="mb-5"
                    color="primary"
                    block
                    @click="updateTwitch"
                    :loading="updating">
                    Update Stream Info
                </v-btn>

                <span v-if="error" class="error--text">{{ error }}</span>
                <v-card v-if="success" color="success">
                    <v-card-title>Success</v-card-title>
                    <v-card-text style="white-space: pre-line;">
                        <div>
                            <v-icon>mdi-format-title</v-icon> {{ success.title }}
                        </div>

                        <div>
                            <v-icon>mdi-controller-classic</v-icon> {{ success.game }}
                        </div>
                    </v-card-text>
                </v-card>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant } from "../../util.js"

export default {
    methods: {
        updateTwitch() {
            this.updating = true

            nodecg.sendMessage('updateTwitch')
                .then((result) => {
                    this.updating = false

                    this.success = result
                    this.error = null
                }).catch(error => {
                    this.updating = false

                    this.success = null
                    this.error = error.message
                });
        }
    },

    data() {
        return {
            updating: false,
            error: null,
            success: null
        }
    }
};
</script>