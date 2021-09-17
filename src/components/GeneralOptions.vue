<template>
    <v-app>
        <v-main>
            <v-container>
                <v-text-field
                    v-model="game"
                    label="Game name"
                ></v-text-field>

                <v-select
                    v-model="boxartUrl"
                    :items="boxartWithEmpty"
                    label="Boxart"
                    dense
                    item-text="name"
                    item-value="url"
                >
                <template v-slot:selection="{ item }">
                    <div class="select-img-wrap">
                        <img class="select-img" :src="item.url">
                    </div>
                    {{ item.name }}
                </template>
                <template v-slot:item="{ item }">
                    <div class="select-img-wrap">
                        <img class="select-img" :src="item.url">
                    </div>
                    {{ item.name }}
                </template>
                </v-select>

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
        bindReplicant.call(this, "boxartUrl")

        // ???
        bindReplicant.call(this, "boxart", "assets:boxart")
    },

    computed: {
        boxartWithEmpty () {
            let modifiedBoxArts = JSON.parse(JSON.stringify(this.boxart))

            modifiedBoxArts.push({
                name:"None",
                url: "",
            })

            modifiedBoxArts.reverse()

            return modifiedBoxArts
        }
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
            boxart: [],
            boxartUrl: "",
        }
    }
};
</script>