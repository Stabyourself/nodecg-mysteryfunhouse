<template>
  <div id="game-timer-box" class="megaman-box">
    <div class="game line-right">
        <div class="heading">
            <div class="heading-inner">Game</div>
        </div>
      <img :src="boxart.url" style="height: 100%; margin-right: 20px;" />
      <div class="game-name">{{ game }}</div>
    </div>
    <div class="goal-submitter line-right">
      <div class="goal">
        <div class="heading">
            <div class="heading-inner">Goal</div>
        </div>
        {{ goal }}
      </div>
      <div class="submitter">
        <div class="heading">
            <div class="heading-inner">Submitted by</div>
        </div>
        {{ submitter }}
      </div>
    </div>

    <div class="round-timer">
      <div class="round">
        <div class="heading">
            <div class="heading-inner">Round</div>
        </div>
        {{ round }}
      </div>
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
  margin: 20px
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

  img {
    height: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
  }
}

.goal-submitter {
  display: flex;
  flex-direction: column;

  .goal, .submitter {
    flex-grow: 1
  }
}

.round-timer {
  display: flex;
  flex-direction: column;
  padding-right: $gap;

  .timer {
    font-size: 4rem;
    width: 250px;
    text-align: center;
  }

  .round, .timer {
    flex-grow: 1;
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
