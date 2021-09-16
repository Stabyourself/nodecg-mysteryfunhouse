<template>
    <div>
        <player-name
            pronoun-h="20"
            name-h="115"
            style="top: 15px; left: 15px; width: 930px; height: 135px">
            <template v-slot:pronouns>
                {{ player1pronouns }}
            </template>
            <template v-slot:name>
                {{ player1name }}
            </template>
        </player-name>


        <player-name
            class="right"
            pronoun-h="20"
            name-h="115"
            style="top: 15px; left: 975px; width: 930px; height: 135px">
            <template v-slot:pronouns>
                {{ player2pronouns }}
            </template>
            <template v-slot:name>
                {{ player2name }}
            </template>
        </player-name>

        <timer
            style="top: 842px;"
            :class="{active: !timer.paused }">
            {{ timerText }}
        </timer>

        <div class="player-done-slider"
            style="top: 848px; left: 15px; width: 930px;"
            :class="{active: player1done || player1forfeit, done: player1done, forfeit: player1forfeit }">
            <timer>
                {{ player1finalTime }}
            </timer>
        </div>

        <div class="player-done-slider"
            :class="{active: player2done || player2forfeit, done: player2done, forfeit: player2forfeit }"
            style="top: 848px; left: 975px; width: 930px;">
            <timer>
                {{ player2finalTime }}
            </timer>
        </div>
    </div>
</template>

<script>
import { bindReplicant, formatTimer } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "game")
        bindReplicant.call(this, "goal")
        bindReplicant.call(this, "platform")
        bindReplicant.call(this, "submitter")
        bindReplicant.call(this, "boxartUrl")

        bindReplicant.call(this, "timer")

        bindReplicant.call(this, "player1name")
        bindReplicant.call(this, "player1pronouns")
        bindReplicant.call(this, "player1done")
        bindReplicant.call(this, "player1forfeit")
        bindReplicant.call(this, "player1finalTime")
        bindReplicant.call(this, "player1volume")

        bindReplicant.call(this, "player2name")
        bindReplicant.call(this, "player2pronouns")
        bindReplicant.call(this, "player2done")
        bindReplicant.call(this, "player2forfeit")
        bindReplicant.call(this, "player2finalTime")
        bindReplicant.call(this, "player2volume")
    },

    computed: {
        timerText() {
            if (this.timer.time) {
                return formatTimer(this.timer.time, false)
            } else {
                return "??:??:??"
            }
        }
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
            player1done: "",
            player1forfeit: "",
            player1volume: 0,
            player1finalTime: false,

            player2name: "",
            player2pronouns: "",
            player2done: "",
            player2forfeit: "",
            player2volume: 0,
            player2finalTime: false,

            timer: {},
        }
    }
};
</script>