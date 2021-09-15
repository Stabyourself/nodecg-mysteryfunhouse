<template>
    <v-app>
        <v-main>
            <v-container>
                <ul>
                    <li>{{ game }}</li>
                    <li>{{ goal }}</li>
                    <li>{{ platform }}</li>
                    <li>{{ submitter }}</li>
                    <li>{{ player1pronouns }}</li>
                    <li>{{ player2pronouns }}</li>
                    <li>{{ player1volume }}</li>
                    <li>{{ timer }}</li>
                    <li>{{ player1done.toString() }}</li>
                </ul>
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
        bindReplicant.call(this, "player1pronouns")
        bindReplicant.call(this, "player2pronouns")
        bindReplicant.call(this, "player1volume")
        bindReplicant.call(this, "timer")
        bindReplicant.call(this, "player1done")
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
            player1pronouns: "",
            player2pronouns: "",
            player1volume: 0,
            timer: 0,
            player1done: false,
        }
    }
};
</script>