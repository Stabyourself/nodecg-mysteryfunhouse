<template>
    <v-app>
        <twitch-player
            style="position: absolute; top: 150px; left: 15px; width: 930px; height:698px;"
            v-if="!player1streamHidden"

            :playerNumber="1"
            :url="player1twitch"
            :volume="player1volume"
            :crop="player1crop"
        ></twitch-player>

        <twitch-player
            v-if="!player2streamHidden"
            style="position: absolute; top: 150px; left: 975px; width: 930px; height:698px"

            :playerNumber="2"
            :url="player2twitch"
            :volume="player2volume"
            :crop="player2crop"
        ></twitch-player>





        <player-name
            pronoun-h="20"
            name-h="115"
            style="top: 15px; left: 20px; width: 925px; height: 135px">
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
            style="top: 15px; left: 975px; width: 925px; height: 135px">
            <template v-slot:pronouns>
                {{ player2pronouns }}
            </template>
            <template v-slot:name>
                {{ player2name }}
            </template>
        </player-name>




        <game-box
            style="top: 865px; left: 15px;"

            :img-url="currentBoxart?currentBoxart.url:''"
            :name="game"
            :goal="goal"
            :submitter="submitter">
        </game-box>

        <rainwave
            style="top: 975px; left: 1521px; width: 444px; height: 124px">
        </rainwave>


        <timer
            style="top: 842px;"
            :class="{active: timer.state == 'playing' }">
            {{ timerText }}
        </timer>

        <player-done-slider
            :finalTime="player1finalTime"
            style="top: 848px; left: 15px; width: 930px;"
            :class="{active: player1done || player1forfeit, done: player1done, forfeit: player1forfeit }">
        </player-done-slider>


        <player-done-slider
            :finalTime="player2finalTime"
            style="top: 848px; left: 975px; width: 930px;"
            :class="{active: player2done || player2forfeit, done: player2done, forfeit: player2forfeit }">
        </player-done-slider>
    </v-app>
</template>

<script>
import { bindReplicant, formatTimer } from "../util.js"

export default {
    created() {
        bindReplicant.call(this, "game")
        bindReplicant.call(this, "goal")
        bindReplicant.call(this, "platform")
        bindReplicant.call(this, "submitter")
        bindReplicant.call(this, "currentBoxart")

        bindReplicant.call(this, "timer")

        bindReplicant.call(this, "player1name")
        bindReplicant.call(this, "player1pronouns")

        bindReplicant.call(this, "player1twitch")
        bindReplicant.call(this, "player1volume")
        bindReplicant.call(this, "player1streamHidden")

        bindReplicant.call(this, "player1done")
        bindReplicant.call(this, "player1forfeit")
        bindReplicant.call(this, "player1finalTime")

        bindReplicant.call(this, "player1crop")

        bindReplicant.call(this, "player2name")
        bindReplicant.call(this, "player2pronouns")

        bindReplicant.call(this, "player2twitch")
        bindReplicant.call(this, "player2volume")
        bindReplicant.call(this, "player2streamHidden")

        bindReplicant.call(this, "player2done")
        bindReplicant.call(this, "player2forfeit")
        bindReplicant.call(this, "player2finalTime")

        bindReplicant.call(this, "player2crop")
    },

    computed: {
        timerText() {
            return formatTimer(this.timer.ms, false, false)
        }
    },

    data() {
        return {
            game: "",
            goal: "",
            platform: "",
            submitter: "",
            currentBoxart: "",

            player1name: "",
            player1pronouns: "",

            player1twitch: "",
            player1volume: 0,
            player1streamHidden: false,

            player1done: "",
            player1forfeit: "",
            player1finalTime: false,

            player1crop: [0, 0, 930, 698],

            player2name: "",
            player2pronouns: "",

            player2twitch: "",
            player2volume: 0,
            player2streamHidden: false,

            player2done: "",
            player2forfeit: "",
            player2finalTime: false,

            player2crop: [0, 0, 930, 698],

            timer: {
                ms: 0
            }
        }
    }
};
</script>