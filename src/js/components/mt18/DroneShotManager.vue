<template>
  <div id="videoHolder"></div>
</template>

<style>
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

#videoHolder {
  width: 1920px;
  height: 1080px;
  position: absolute;
}

video {
  position: absolute;
  animation: fade-in 2s linear;
  width: 100%;
  height: 100%;
}
</style>

<script>
const droneShots = nodecg.Replicant('assets:droneShots');

export default {
  methods: {
    newVideo() {
      // pick random new video
      let newVideo = this.currentVideo;
      while (newVideo === this.currentVideo) {
        newVideo = Math.floor(Math.random() * droneShots.value.length);
      }
      console.log(newVideo);
      this.currentVideo = newVideo;

      // Create video element
      const video = document.createElement('video');

      video.src = droneShots.value[this.currentVideo].url;
      video.controls = false;
      video.muted = true;
      video.height = 1920; // in px
      video.width = 1080; // in px
      video.play();
      let deleting = false;
      video.addEventListener('timeupdate', () => {
        if (video.currentTime >= video.duration - 2 && !deleting) {
          // remove the video from the dom
          this.newVideo();
          deleting = true;

          setTimeout(() => {
            video.remove();
          }, 2000);
        }
      });

      const videoHolder = document.getElementById('videoHolder');

      // Include in HTML as child of #box
      videoHolder.appendChild(video);
    },
  },

  mounted() {
    droneShots.on('change', (newValue) => {
      this.newVideo();
    });
  },

  data() {
    return {
      currentVideo: -1,
    };
  },
};
</script>
