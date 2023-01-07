<template>
  <div class="rainwave-box">
    <iframe
      width="385"
      height="94"
      frameBorder="0"
      scrolling="no"
      :src="`https://rainwave.cc/widget/widget?sid=${rainwaveId}&layout=art_right&text_align=right&anim_in=to_bottom&anim_out=to_right&art_size=70px&font_size=15pt&max_width=360px&np_header=no&ad=0&show_artist=true&delay=3`"
    ></iframe>
  </div>
</template>

<style scoped lang="scss">
.rainwave-box {
  position: absolute;
}
</style>

<script>
import { bindReplicant } from "../util.js";

export default {
  created() {
    bindReplicant.call(this, "rainwaveId");
  },

  data() {
    return {
      rainwaveId: 1,
    };
  },
};
</script>
