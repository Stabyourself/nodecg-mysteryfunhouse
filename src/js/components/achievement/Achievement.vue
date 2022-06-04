<template>
  <div class="achievement" ref="achievement">
    <div class="animation">
      <div class="circle">
        <div class="img trophy_animate trophy_img">
          <img
            class="trophy_1"
            src="/bundles/nodecg-mysteryfunhouse/dist/img/achievement/trophy_full.svg"
          />
          <img
            class="trophy_2"
            src="/bundles/nodecg-mysteryfunhouse/dist/img/achievement/trophy_no_handles.svg"
          />
        </div>
        <div class="img xbox_img">
          <v-icon size="38">{{ this.data.icon }}</v-icon>
        </div>
      </div>
      <div class="banner-outer">
        <div class="banner">
          <div class="achieve_disp">
            <span class="unlocked"> </span>
            <div class="score_disp">
              <!-- <div class="gamerscore">
                <img
                  width="20px"
                  src="/bundles/nodecg-mysteryfunhouse/dist/img/achievement/G.svg"
                />
                <span class="acheive_score"></span>
              </div>
              <span class="hyphen_sep">-</span> -->
              <span class="achiev_name"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$background: #39960c;
$background-light: #40a90e;
$background-lighter: #42ae0e;
$background-dark: #32830a;

.achievement * {
  box-sizing: border-box;
}

.achievement {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  position: fixed;
  pointer-events: none;
  width: 100%;
  bottom: 16px;
  z-index: 100;
}

@keyframes rotate {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(360deg);
  }
  100% {
    transform: rotateY(0deg);
  }
}

@keyframes scale_circle_1 {
  0% {
    transform: scale3d(0, 0, 0);
  }
  2% {
    opacity: 1;
  }
  5% {
    transform: scale3d(1, 1, 1);
    opacity: 0.8;
  }
  6% {
    opacity: 0;
  }
  9% {
    opacity: 0;
  }
  10% {
    transform: scale3d(1, 1, 1);
    opacity: 0;
  }
  90% {
    transform: scale3d(0, 0, 0);
  }
  92% {
    opacity: 1;
  }
  95% {
    transform: scale3d(1, 1, 1);
    opacity: 0.8;
  }
  96% {
    opacity: 0;
  }
  99% {
    opacity: 0;
  }
  100% {
    transform: scale3d(1, 1, 1);
    opacity: 0;
  }
}

@keyframes circle_grow_move {
  1% {
    opacity: 0;
    transform: scale(0.1);
  }
  4% {
    transform: scale(1.1);
  }
  5% {
    transform: scale(1);
    opacity: 1;
  }
  11% {
    transform: translate(0);
    background-color: $background;
  }
  24% {
    transform: translateX(-140px);
    background-color: $background-lighter;
  }
  85% {
    transform: translateX(-140px);
    background-color: $background-lighter;
  }
  89% {
    transform: translateX(0);
    background-color: $background;
  }
  94% {
    transform: scale(1);
  }
  96% {
    transform: scale(1.1);
  }
  98% {
    transform: scale(0.1);
    opacity: 1;
  }
  99% {
    opacity: 0;
  }
  100% {
    transform: scale(0.1);
  }
}

@keyframes trophy_animate_opacity {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 0;
  }
  24% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  95% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@keyframes xbox_animate_opacity {
  0% {
    opacity: 1;
  }
  19% {
    opacity: 1;
    transform: scale3d(1, 1, 1);
  }
  23% {
    opacity: 0;
  }
  90% {
    opacity: 0;
  }
  95% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

@keyframes banner-animate {
  0% {
    width: 75px;
    opacity: 0;
  }
  2% {
    opacity: 0;
  }
  4% {
    opacity: 1;
  }
  11% {
    width: 75px;
  }
  24% {
    width: 355px;
  }
  85% {
    width: 355px;
  }
  89% {
    width: 75px;
    opacity: 1;
  }
  90% {
    opacity: 0;
  }
}

@keyframes textSlide {
  0% {
    transform: translateY(85px);
    opacity: 0;
  }
  20% {
    transform: translateY(85px);
    opacity: 0;
  }
  25% {
    transform: translateY(0);
    opacity: 1;
  }
  79% {
    transform: translateY(0);
    opacity: 1;
  }
  84% {
    transform: translateY(-115px);
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.animation {
  width: 355px;
  height: 110px;
  padding: 5px 0px 5px 0px;
  position: relative;
  margin: auto;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-wrap: wrap;
  flex-wrap: wrap;
  -ms-flex-align: center;
  align-items: center;
  -ms-flex-pack: center;
  justify-content: center;
}

.circle.circle_animate {
  animation: circle_grow_move;
  animation-duration: 10.5s;
  transform-origin: center;
}

.circle.circle_animate::before {
  animation: scale_circle_1;
  animation-duration: 10.5s;
  transform-origin: center;
  animation-iteration-count: 2;
}

.circle.circle_animate::after {
  animation: scale_circle_1;
  animation-duration: 10.5s;
  animation-delay: 0.1s;
  transform-origin: center;
}

.circle.circle_animate .trophy_animate {
  animation: trophy_animate_opacity;
  animation-duration: 10.5s;
}

.circle.circle_animate .xbox_img {
  animation: xbox_animate_opacity;
  animation-duration: 10.5s;
  z-index: 102;
}

.circle {
  width: 75px;
  height: 75px;
  top: 0;
  opacity: 0;
  margin: 0 auto;
  border-radius: 100%;
  background: $background;
  position: relative;
  overflow: hidden;
  z-index: 4;
}

.circle::before {
  content: "";
  opacity: 0;
  width: 75px;
  height: 75px;
  background-color: $background-light;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  display: block;
}

.circle::after {
  content: "";
  opacity: 0;
  width: 75px;
  height: 75px;
  background-color: $background-dark;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  display: block;
}

.circle .img {
  height: 50%;
  left: 25%;
  top: 25%;
  position: absolute;
  z-index: 100;
}

.circle .img img {
  height: 100%;
  position: absolute;
}

.circle .trophy_1 {
  animation: rotate;
  animation-duration: 6s;
  animation-iteration-count: infinite;
}

.achieve_disp_animate {
  animation: textSlide;
  animation-duration: 10.5s;
}

.banner {
  width: 355px;
  height: 75px;
  position: relative;
  left: 0;
  opacity: 0;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  -ms-flex-align: center;
  align-items: center;
  -ms-flex-pack: center;
  justify-content: center;
  right: 0;
  margin: 0 auto;
  background: $background;
  overflow: hidden;
  border-radius: 100px;
}

.banner-outer {
  display: -ms-flexbox;
  display: flex;
  -ms-flex-align: center;
  align-items: center;
  -ms-flex-line-pack: center;
  align-content: center;
  width: 100%;
  top: -75px;
  position: relative;
}

.banner.banner-animate {
  animation: banner-animate;
  animation-duration: 10.5s;
}

.achieve_name::before,
.achieve_score::before {
  display: none !important;
  opacity: 0;
  content: "";
}

.achieve_name::after,
.achieve_score::after {
  display: none;
  content: "";
}

.achieve_disp {
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: column;
  flex-direction: column;
  width: 60%;
  position: absolute;
  -ms-flex-pack: center;
  justify-content: center;
  margin-left: 95px;
  left: 0;
  height: 100%;
  top: 0;
}

.achieve_disp input {
  opacity: 1 !important;
}

.achieve_disp .score_disp {
  width: 100%;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: row;
  flex-direction: row;
  -ms-flex-align: start;
  align-items: flex-start;
  margin-bottom: 0 !important;
}

.achieve_disp .achiev_name {
  border: none;
  outline: none;
  background: none;
  font-size: 13pt;
  color: white;
  line-height: 24px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.acheive_score {
  margin-left: 5px;
  margin-right: 5px;
  color: white;
}

.unlocked {
  width: 100%;
  color: white;
  font-weight: 400;
}

.gamerscore {
  display: -ms-flexbox;
  display: flex;
  -ms-flex-direction: row;
  flex-direction: row;
  -ms-flex-align: center;
  align-items: center;
  height: 24px;
}

.gamerscore input {
  margin-left: 5px;
  width: 30px;
  margin-right: 5px;
  background: none;
  outline: none;
  border: none;
  color: white;
  overflow: visible;
  font-family: "open sans", sans-serif;
  font-weight: bold;
  font-size: 13pt;
}

.hyphen_sep {
  margin-right: 5px;
  color: white;
  font-size: 15pt;
  line-height: 24px;
}
</style>

<script>
export default {
  props: {
    data: Object,
  },

  mounted() {
    let title = this.data.description;
    let score = this.data.score;

    let achievement = this.$refs.achievement;

    achievement.querySelector(".achiev_name").innerText = title;
    // achievement.querySelector(".acheive_score").innerText = score;
    achievement.querySelector(".unlocked").innerText = this.data.name;
    achievement.querySelector(".circle").classList.add("circle_animate");
    achievement.querySelector(".banner").classList.add("banner-animate");
    achievement
      .querySelector(".achieve_disp")
      .classList.add("achieve_disp_animate");
    setTimeout(() => {
      achievement.querySelector(".circle").classList.remove("circle_animate");
      achievement.querySelector(".banner").classList.remove("banner-animate");
      achievement
        .querySelector(".achieve_disp")
        .classList.remove("achieve_disp_animate");
    }, 12000);
  },
};
</script>
