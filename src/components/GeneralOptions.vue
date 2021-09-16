<template>
    <v-app>
        <v-main>
            <v-container>
                <v-text-field
                    v-model="game"
                    label="Game name"
                ></v-text-field>

                <v-text-field
                    v-model="goal"
                    label="Goal"
                ></v-text-field>

                <v-text-field
                    v-model="platform"
                    label="Platform"
                ></v-text-field>

                <v-text-field
                    v-model="submitter"
                    label="Submitter"
                ></v-text-field>

                <v-select
                    v-model="boxartUrl"
                    :items="boxarts"
                    label="Boxart"
                    dense
                    item-text="name"
                    item-value="url"
                >
                <template v-slot:selection="{ item }">
                    <img class="select-img" :src="item.url">{{ item.name }}
                </template>
                <template v-slot:item="{ item }">
                    <img class="select-img" :src="item.url">{{ item.name }}
                </template>
                </v-select>
            </v-container>
        </v-main>
    </v-app>
</template>

<script>
import { bindReplicant } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "game")
        bindReplicant.call(this, "goal")
        bindReplicant.call(this, "platform")
        bindReplicant.call(this, "submitter")
        bindReplicant.call(this, "boxarts", "assets:boxart")
        bindReplicant.call(this, "boxartUrl")
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
            boxarts: [],
            boxartUrl: "",
        }
    }
};
</script>