<template>
  <div id="game-box" class="pga-box">
    <swipe :visible="visible" dir="right" id="game-boxart" v-if="boxart" :delay="0">
      <div class="d-flex align-center" style="height: 100%">
        <img :src="boxart.url" />
      </div>
    </swipe>

    <div id="game-info">
      <swipe :visible="visible" dir="right" :delay="0.8">
        <div id="game">
          <fit-text :max="1" :min="0.1">
            {{ game }}
          </fit-text>
        </div>
      </swipe>

      <div id="game-info-body">
        <swipe :visible="visible" dir="right" :delay="0.9">
          <div id="goal">
            {{ goal }}
          </div>
        </swipe>

        <swipe :visible="visible" dir="right" :delay="1" v-if="submitter != ''">
          <div id="submitter">
            <fit-text :max="1" :min="0.1"> Submitted by {{ submitter }} </fit-text>
          </div>
        </swipe>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$whiteBoxFont: 'Arvo', serif;
#game-box {
  display: flex;
  max-width: 1300px;
}

#game-boxart {
  height: 100%;

  img {
    display: block;
    margin: 0 auto;
    max-height: 100%;
    max-width: 325px;
  }
}

#game-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

#game {
  width: 100%;
  text-transform: none;
  background-color: white;
  font-family: $whiteBoxFont;
  color: #333;
  padding: 0 1rem !important;
  line-height: 1.4;
  font-size: 3em;
  padding-right: 100px;
  display: flex;
  align-items: center;
}

#game-info-body {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: 100px;
}

#goal {
  padding: 0.1em 1rem !important;
  font-size: 2em;
  line-height: 1;
}

#submitter {
  padding: 0.1em 1rem !important;
  font-size: 1.5em;
  line-height: 1;
  font-weight: 300;
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
  },
};
</script>
