<template>
  <div id="side-box">
    <div id="game-box" class="megaman-box">
      <div class="game">
        <img :src="boxart.url" style="height: 100%; margin-right: 20px;" />
        <div class="game-name">{{ game }}</div>
      </div>

      <div class="goal border-top">
        <div class="heading">
            <div class="heading-inner">Goal</div>
        </div>
        <div class="goal-text">
          {{ goal }}
        </div>
      </div>

      <div class="submitter border-top">
        <div class="heading">
            <div class="heading-inner">Submitter</div>
        </div>
        <div class="submitter-text">
        {{ submitter }}
        </div>
      </div>
    </div>

      <div class="timer megaman-box">
          {{ timer }}
      </div>
  </div>
</template>

<style scoped lang="scss">
#side-box {
  display: flex;
  flex-direction: column;
  gap: 50px;
  width: 530px;
  align-items: stretch;
}

#game-box {
  display: flex;
  flex-direction: column;
  font-family: "Pixellari";
  font-size: 1.5em;
  background: #000b2e;
  line-height: 0.8;
  padding-bottom: 20px;
}

.border-top {
  margin-top: 50px;
}

.heading {
  position: absolute;
  width: 100%;
  top: -25px;
  left: -5px;
  font-family: "Press Start 2P";
  display: flex;

  .heading-inner {
    border: 5px solid #82c5fa;
    background: #0959c0;
    color: white;
    font-size: 0.8rem;
    padding: 0.2em 0.4em;
  }
}

.game, .goal, .submitter {
  position: relative;
}

.game {
  display: flex;
  font-size: 2em;
  height: 200px;

  img {
    max-width: 300px;
    height: 100%;
    object-fit: cover;
  }

  .game-name {
    margin-top: 10px;
  }
}

  .goal-text {
    margin-top: 8px;
  }

  .submitter-text {
    margin-top: 8px;
  }

.timer {
  background: #000b2e;
  font-family: "Pixellari";
  text-align: center;
  font-size: 4rem;
  flex-grow: 1;
  line-height: 1;
  padding-top: 10px;
}
</style>

<script>
export default {
  props: {
    visible: Boolean,
    game: String,
    goal: String,
    submitter: String,
    boxart: Object,
    timer: String,
    round: String,
  },
};
</script>
