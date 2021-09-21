<template>
    <div></div>
</template>

<script>
import { init } from "../../html/graphics/js/threejs/scene.js"

export default {
    mounted() {
        init(this.$el)
    }
};
</script>
