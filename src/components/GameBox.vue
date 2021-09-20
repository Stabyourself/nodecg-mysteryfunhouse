<template>
    <div class="game-box mt-font">
        <div class="boxart" v-if="imgUrl">
            <img :src="imgUrl">
        </div>

        <div class="text">
            <div class="game">
                <fit-text :max="1" :min="0.1">
                    <v-icon x-large dark class="mr-3">mdi-controller-classic</v-icon>
                    {{ name }}
                </fit-text>
            </div>
            <div class="goal">
                <fit-text :max="1" :min="0.1">
                    <v-icon x-large dark class="mr-3">mdi-trophy-variant</v-icon>
                    {{ goal }}
                </fit-text>
            </div>
            <div class="submitter">Submitted by {{ submitter }}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
    $boxartSize: 200px;
    .game-box {
        position: absolute;
        display: flex;
        align-items: flex-end;
        font-size: 3rem;
        height: $boxartSize;
        max-width: 765px;

        .boxart {
            margin-right: 15px;
            img {
                display: block;
                margin: 0 auto;
                height: $boxartSize;
                max-width: 335px;
            }
        }

        .text {
            .submitter {
                font-size: 0.6em;
            }
        }
    }
</style>

<script>
export default {
    props: [
        "imgUrl",
        "name",
        "goal",
        "submitter",
    ]
};
</script>