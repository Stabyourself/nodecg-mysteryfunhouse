<template>
    <div>
        <div
            id="player1twitch"
            style="position: absolute; top: 150px; left: 15px; width: 930px; height:698px"
        ></div>

        <div
            id="player2twitch"
            style="position: absolute; top: 150px; left: 975px; width: 930px; height:698px"
        ></div>





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





        <div class="game-box mt-font"
            style="top: 875px; left: 15px;">
            <div class="boxart">
                <img :src="boxartUrl">
            </div>

            <div class="text">
                <div class="game">{{ game }}</div>
                <div class="goal">{{ goal }}</div>
                <div class="submitter">Submitted by {{ submitter }}</div>
            </div>
        </div>





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

let twitchOptions = {
    width: 930,
    height: 698,
    channel: null,
    autoplay: true,
    muted: false,
    parent: ["nodecg.guegan.de"]
}
let player1, player2

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
        bindReplicant.call(this, "player1twitch")
        bindReplicant.call(this, "player1done")
        bindReplicant.call(this, "player1forfeit")
        bindReplicant.call(this, "player1finalTime")
        bindReplicant.call(this, "player1volume")

        bindReplicant.call(this, "player2name")
        bindReplicant.call(this, "player2pronouns")
        bindReplicant.call(this, "player2twitch")
        bindReplicant.call(this, "player2done")
        bindReplicant.call(this, "player2forfeit")
        bindReplicant.call(this, "player2finalTime")
        bindReplicant.call(this, "player2volume")
    },

    computed: {
        timerText() {
            if (this.timer.time) {
                return formatTimer(this.timer.time, false, false)
            } else {
                return ""
            }
        }
    },

    watch: {
        player1twitch(newValue) {
            const el = document.getElementById("player1twitch");
            el.innerHTML = '';

            twitchOptions.channel = newValue
            player1 = new Twitch.Player("player1twitch", twitchOptions)
            player1.addEventListener(Twitch.Embed.VIDEO_READY, () => {
                console.log(this.player1volume/100)
                player1.setMuted(false);
                player1.setVolume(this.player1volume/100);
            });
        },

        player2twitch(newValue) {
            const el = document.getElementById("player2twitch");
            el.innerHTML = '';

            twitchOptions.channel = newValue
            player2 = new Twitch.Player("player2twitch", twitchOptions)
            player2.addEventListener(Twitch.Embed.VIDEO_READY, () => {
                player2.setMuted(false);
                player2.setVolume(this.player2volume/100);
            });
        },

        player1volume(newValue) {
            player1.setVolume(newValue/100);
        },

        player2volume(newValue) {
            player2.setVolume(newValue/100);
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
            player1twitch: "",
            player1done: "",
            player1forfeit: "",
            player1volume: 0,
            player1finalTime: false,

            player2name: "",
            player2pronouns: "",
            player2twitch: "",
            player2done: "",
            player2forfeit: "",
            player2volume: 0,
            player2finalTime: false,

            timer: {},
        }
    }
};
</script>