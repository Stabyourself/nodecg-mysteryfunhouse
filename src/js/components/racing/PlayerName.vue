<template>
    <div class="player-name">
        <div class="pronouns" :style="{height: pronounH + 'px'}">
            <slot name="pronouns"></slot>
        </div>

        <div class="name" :style="{height: nameH + 'px', 'line-height': nameH + 'px'}">
            <slot name="name"></slot>
        </div>
    </div>
</template>

<style scoped lang="scss">
.player-name {
    font-size: 2rem;
    position: absolute;

    &.right {
        text-align: right;
    }

    .name {
        overflow-wrap: break-word;
        margin-top: -10px;

        span {
            width: 100%;
        }
    }
}
</style>

<script>
export default {
    props: [
        "pronounH",
        "nameH",
        "visible"
    ]
};
</script>