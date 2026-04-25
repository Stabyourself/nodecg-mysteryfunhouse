<template>
  <div id="game-timer-box" class="megaman-box">
    <div class="game line-right">
      <img :src="boxart.url" style="height: 100%; margin-right: 20px;" />
      <div class="game-name">{{ game }}</div>
    </div>
    <div class="goal-submitter line-right">
      <div class="goal">
        <div class="heading">
            <div class="heading-inner">Goal</div>
        </div>
        <div class="goal-text">
          {{ goal }}
        </div>
      </div>
      <div class="submitter">
        <div class="heading">
            <div class="heading-inner">Submitter</div>
        </div>
        <div class="submitter-text">
        {{ submitter }}
        </div>
      </div>
    </div>

    <div class="round-timer">
      <div class="round">
        <div class="heading">
            <div class="heading-inner">Round</div>
        </div>
        <div class="round-text">
          {{ round }}
        </div>
      </div>
      <div class="line"></div>
      <div class="timer">
        {{ timer }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$gap: 20px;

#game-timer-box {
  display: flex;
  height: 150px;
  font-family: "Pixellari";
  font-size: 2em;
  background: #000b2e;
  gap: $gap;
  margin: 20px;
  line-height: 0.8;
}

.line-right {
  border-right: 5px solid #82c5fa;
  padding-right: $gap;
}

.heading {
  position: absolute;
  width: 100%;
  top: -25px;
  font-family: "Press Start 2P";
  display: flex;
  justify-content: center;

  .heading-inner {
    border: 5px solid #82c5fa;
    background: #0959c0;
    color: white;
    font-size: 0.8rem;
    padding: 0.2em 0.4em;
  }
}

.game, .goal, .submitter, .round, .timer {
  position: relative;
}

.game {
  display: flex;
  font-size: 1.7em;

  img {
    max-width: 300px;
    height: 100%;
    object-fit: cover;
  }

  .game-name {
    margin-top: 10px;
  }
}

.goal-submitter {
  display: flex;
  flex-direction: column;
  font-size: 0.8em;

  .goal, .submitter {
    flex-grow: 1;
  }

  .goal-text {
    margin-top: 8px;
  }

  .submitter-text {
    margin-top: 8px;
  }
}

.round-timer {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  padding-right: $gap;
    text-align: center;

  .round-text {
    margin-top: 20px;
  }

  .timer {
    font-size: 4rem;
    width: 250px;
    margin-top: 20px;
  }

  .round, .timer {
    flex-grow: 1;
  }

  .line {
    width: 100%;
    height: 5px;
    background: #82c5fa;
  }
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
