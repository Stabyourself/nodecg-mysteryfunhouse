<template>
    <div class="player-done-slider">
        <timer>
            {{ finalTime }}
        </timer>
    </div>
</template>

<style scoped lang="scss">
    .player-done-slider {
        position: absolute;
        overflow: hidden;
        height: 95px;

        .timer {
            font-size: 4rem;
            transform: translateY(-95px);
            transition: transform 0.3s;
        }

        &.active .timer {
            transform: translateY(0px);
        }

        &.done .timer {
            color: lightgreen;
        }

        &.forfeit .timer {
            color: lightcoral;
        }
    }
</style>

<script>
export default {
    props: [
        "finalTime",
    ]
};
</script>