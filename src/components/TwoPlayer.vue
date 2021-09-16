<template>
    <div>
        <player-name
            x="15"
            y="15"
            w="930"
            h="135">
            <template v-slot:pronouns>
                {{ player1pronouns }}
            </template>
            <template v-slot:name>
                {{ player1name }}
            </template>
        </player-name>


        <player-name
            x="975"
            y="15"
            w="930"
            h="135"
            class="right">
            <template v-slot:pronouns>
                {{ player2pronouns }}
            </template>
            <template v-slot:name>
                {{ player2name }}
            </template>
        </player-name>
    </div>
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
        bindReplicant.call(this, "player1name")
        bindReplicant.call(this, "player1pronouns")
        bindReplicant.call(this, "player2name")
        bindReplicant.call(this, "player2pronouns")
        bindReplicant.call(this, "player1volume")
        bindReplicant.call(this, "timer")
        bindReplicant.call(this, "player1done")
        bindReplicant.call(this, "player1finalTime")
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
            boxartUrl: "",
            player1name: "",
            player1pronouns: "",
            player2name: "",
            player2pronouns: "",
            player1volume: 0,
            timer: 0,
            player1done: false,
            player1finalTime: false,
        }
    }
};
</script>