<template>
    <v-app>
        <swipe :delay="0.5" :visible="visible" class="match-round" style="top: 10px">
            <div class="logo pixel-font pixel-font-alt">
                MT16<span class="logo-small">bit</span>
            </div>
            <div class="round pixel-font pixel-font-alt">
                {{ round }}
            </div>
        </swipe>


        <player-name
            :visible="visible"
            pronoun-h="40"
            name-h="95"
            style="top: 15px; left: 20px; width: 925px; height: 135px">
            <template v-slot:pronouns>
                <swipe :visible="visible" dir="up" :delay="0.5">
                    <span class="pixel-font pixel-font-alt">{{ player0pronouns }}</span>
                </swipe>
            </template>
            <template v-slot:name>
                <swipe dir="up" :visible="visible">
                    <fit-text :max="2.5" class="pixel-font pixel-font-alt">{{ player0name }}</fit-text>
                </swipe>
            </template>
        </player-name>

        <player-name
            :visible="visible"
            class="right"
            pronoun-h="40"
            name-h="95"
            style="top: 15px; left: 975px; width: 925px; height: 135px">
            <template v-slot:pronouns>
                <swipe :visible="visible" dir="up" :delay="0.5">
                    <span class="pixel-font pixel-font-alt">{{ player1pronouns }}</span>
                </swipe>
            </template>
            <template v-slot:name>
                <swipe dir="up" :visible="visible">
                    <fit-text :max="2.5" class="pixel-font pixel-font-alt">{{ player1name }}</fit-text>
                </swipe>
            </template>
        </player-name>


        <div style="position: absolute; top: 150px; left: 15px; width: 930px; height:698px;">
            <twitch-player
                :opacity="player0streamHidden ? 0 : 1"

                :playerNumber="0"
                :url="player0twitch"
                :quality="player0quality ? player0quality : 'auto'"
                :volume="player0streamHidden ? 0 : player0volume"
                :crop="player0crop"
            ></twitch-player>
        </div>

        <div style="position: absolute; top: 150px; left: 975px; width: 930px; height:698px">
            <twitch-player
                :opacity="player1streamHidden ? 0 : 1"

                :playerNumber="1"
                :url="player1twitch"
                :quality="player1quality ? player1quality : 'auto'"
                :volume="player1streamHidden ? 0 : player1volume"
                :crop="player1crop"
            ></twitch-player>
        </div>


        <player-done-slider
            :finalTime="player0finalTime"
            style="top: 848px; left: 15px; width: 930px;"
            :class="{active: player0done || player0forfeit, done: player0done, forfeit: player0forfeit }">
        </player-done-slider>


        <player-done-slider
            :finalTime="player1finalTime"
            style="top: 848px; left: 975px; width: 930px;"
            :class="{active: player1done || player1forfeit, done: player1done, forfeit: player1forfeit }">
        </player-done-slider>


        <game-box style="top: 865px; left: 15px;">
            <template v-slot:boxart>
                <swipe :visible="visible" dir="right" class="boxart" v-if="currentBoxart">
                    <div class="d-flex align-center" style="height: 100%;">
                        <img :src="currentBoxart.url">
                    </div>
                </swipe>
            </template>

            <template v-slot:text>
                <swipe :visible="visible" dir="up" :delay="1" class="game">
                    <fit-text :max="1" :min="0.1">
                        <span class="pixel-font pixel-font-alt">{{ game }}</span>
                    </fit-text>
                </swipe>
                <swipe :visible="visible" dir="up" :delay="0.8" class="goal">
                    <fit-text :max="1" :min="0.1">
                        <span class="pixel-font pixel-font-alt">{{ goal }}</span>
                    </fit-text>
                </swipe>
                <!-- <div class="submitter">Submitted by {{ submitter }}</div> -->
            </template>
        </game-box>


        <!-- <rainwave
            v-if="showRainwave"
            style="top: 975px; left: 1521px; width: 444px; height: 124px">
        </rainwave> -->


        <timer
            style="top: 848px;"
            :class="{active: timer.state == 'playing' }">
            <swipe dir="down" :visible="visible">
                {{ timerText }}
            </swipe>
        </timer>
    </v-app>
</template>

<style lang="scss" scoped>
    .boxart {
        margin-right: 15px;
        height: 100%;

        img {
            display: block;
            margin: 0 auto;
            max-height: 100%;
            max-width: 335px;
        }
    }

    .logo {
        font-size: 3em;

        .logo-small {
            font-size: 0.3em;
        }
    }

    .round {
        margin-top: -30px;
    }

    .match-round {
        margin-top: -26px;
    }
</style>

<script>
import { bindReplicant, formatTimer } from "../../util.js"

export default {
    created() {
        bindReplicant.call(this, "game")
        bindReplicant.call(this, "goal")
        bindReplicant.call(this, "platform")
        bindReplicant.call(this, "submitter")
        bindReplicant.call(this, "currentBoxart")

        bindReplicant.call(this, "timer")

        bindReplicant.call(this, "showRainwave")


        bindReplicant.call(this, "round", "match1round")

        for (let i = 0; i < 2; i++) {
            bindReplicant.call(this, `player${i}name`)
            bindReplicant.call(this, `player${i}pronouns`)

            bindReplicant.call(this, `player${i}twitch`)
            // bindReplicant.call(this, `player${i}quality`)
            bindReplicant.call(this, `player${i}volume`)
            bindReplicant.call(this, `player${i}streamHidden`)

            bindReplicant.call(this, `player${i}done`)
            bindReplicant.call(this, `player${i}forfeit`)
            bindReplicant.call(this, `player${i}finalTime`)

            bindReplicant.call(this, `player${i}crop`)
        }

        if (window.obsstudio && window.obsstudio.getControlLevel && window.obsstudio.getControlLevel != 0) {
            window.obsstudio.getCurrentScene((scene) => {
                console.log("Start scene: " + scene.name)
                if (scene.name == "2 Player") {
                    this.visible = true
                }
            })

            window.addEventListener('obsSceneChanged', (event) => {
                console.log("Switched to scene " + event.detail.name)
                if (event.detail.name == "2 Player") {
                    this.visible = true
                } else {
                    this.visible = false
                }
            })
        } else {
            this.visible = false
            setTimeout(() => {this.visible = true}, 0)

            document.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    this.visible = !this.visible
                }
            })
        }
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

            round: "",

            player0name: "",
            player0pronouns: "",

            player0twitch: "",
            player0quality: null,
            player0volume: 0,
            player0streamHidden: false,

            player0done: false,
            player0forfeit: false,
            player0finalTime: false,

            player0crop: [0, 0, 0, 0],

            player1name: "",
            player1pronouns: "",

            player1twitch: "",
            player1quality: null,
            player1volume: 0,
            player1streamHidden: false,

            player1done: false,
            player1forfeit: false,
            player1finalTime: false,

            player1crop: [0, 0, 0, 0],

            timer: {
                ms: 0
            },

            showRainwave: false,

            visible: false,
        }
    }
};
</script>