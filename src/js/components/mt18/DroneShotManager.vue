<template>
  <div id="videoHolder"></div>
</template>

<style lang="scss">
#videoHolder {
  width: 1920px;
  height: 1080px;
  position: absolute;
}

video {
  position: absolute;
  transition: opacity 2s linear;
  width: 100%;
  height: 100%;
  opacity: 1;

  &.fadeout {
    opacity: 0;
  }
}
</style>

<script>
const droneShots = nodecg.Replicant('assets:droneShots');

export default {
  methods: {
    newVideo() {
      // pick random new video until it's not in lastVideos
      let nextVideo;
      do {
        nextVideo = Math.floor(Math.random() * droneShots.value.length);
      } while (this.lastVideos.includes(nextVideo));

      this.lastVideos.push(nextVideo);
      this.lastVideos = this.lastVideos.slice(-3);

      // Create video element
      const video = document.createElement('video');

      video.src = droneShots.value[nextVideo].url;
      video.controls = false;
      video.muted = true;
      video.height = 1920; // in px
      video.width = 1080; // in px
      video.play();
      let deleting = false;
      video.addEventListener('timeupdate', () => {
        if (video.currentTime >= video.duration - 3 && !deleting) {
          // remove the video from the dom
          this.newVideo();
          deleting = true;

          setTimeout(() => {
            video.classList.add('fadeout');

            setTimeout(() => {
              video.remove();
            }, 2000);
          }, 1000);
        }
      });

      const videoHolder = document.getElementById('videoHolder');

      // Include in HTML as child of #box
      videoHolder.prepend(video);
    },
  },

  mounted() {
    droneShots.on('change', () => {
      this.newVideo();
    });
  },

  data() {
    return {
      lastVideos: [],
    };
  },
};
</script>
