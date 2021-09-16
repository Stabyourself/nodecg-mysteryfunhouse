<template>
    <div class="player-name mt-font"
        :style="{top:y+'px', left:x+'px', width:w+'px', height:h+'px'}">
        <div class="pronouns">
            <slot name="pronouns"></slot>
        </div>

        <div class="name d-flex align-center">
            <fit-text :max="3"><slot name="name"></slot></fit-text>
        </div>
    </div>
</template>

<script>
export default {
    props: [
        "x",
        "y",
        "w",
        "h"
    ]
};
</script>