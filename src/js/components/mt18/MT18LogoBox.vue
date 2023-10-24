<template>
  <div id="logo-box">
    <div>
      <div id="round">
        <swipe dir="left" :visible="visible" :delay="0.8">
          <span>{{ round }}</span>
        </swipe>
      </div>
      <div id="timer">
        <swipe dir="left" :visible="visible" :delay="1">
          <span>{{ timer }}</span>
        </swipe>
      </div>
    </div>

    <swipe dir="swing-left" :visible="visible" :delay="0">
      <img class="logo" id="logo" :src="logo.url" />
    </swipe>
  </div>
</template>

<style lang="scss" scoped>
#logo-box {
  display: flex;
  align-items: flex-end;
}

#logo {
  display: block;
  opacity: 0.6;
  max-width: 300px;
  max-height: 185px;
}

#round {
  text-align: right;
  font-size: 3em;
  text-transform: uppercase;
  font-weight: 300;
  line-height: 1.2;

  span {
    padding-right: 15px;
  }
}

#timer {
  text-align: right;
  font-size: 4em;
  line-height: 0.9;
  font-weight: 700;

  span {
    padding-right: 15px;
  }
}
</style>

<script>
export default {
  props: {
    visible: Boolean,
    round: String,
    timer: String,
    logo: Object,
  },
};
</script>
