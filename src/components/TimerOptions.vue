<template>
    <v-app>
        <v-theme-provider dark>
            <v-main>
                <v-container>
                    <v-btn
                        color="success"
                        elevation="2"
                        @click="clicky(50)"
                    >clicky
                    </v-btn>

                    <v-btn
                        color="success"
                        elevation="2"
                        @click="clicky(10)"
                    >clicky
                    </v-btn>
                </v-container>
            </v-main>
        </v-theme-provider>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    methods: {
        clicky(s) {
            this.timer = s;
        }
    },

    mounted() {
        bindReplicant.call(this, "timer")
    },

    data() {
        return {
            timer: 0
        };
    },
};
</script>