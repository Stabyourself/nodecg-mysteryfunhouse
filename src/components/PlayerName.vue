<template>
    <div class="player-name mt-font">
        <div class="pronouns" :style="{height: pronounH + 'px'}">
            <slot name="pronouns"></slot>
        </div>

        <div class="name d-flex align-center" :style="{height: nameH + 'px', 'line-height': nameH + 'px'}">
            <fit-text :max="345/nameH"><slot name="name"></slot></fit-text>
        </div>
    </div>
</template>

<script>
export default {
    props: [
        "pronounH",
        "nameH",
    ]
};
</script>