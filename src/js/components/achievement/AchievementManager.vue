<template>
  <div>
    <Achievement
      v-for="achievement of achievements"
      :key="achievement.id"
      :data="achievement"
    ></Achievement>
  </div>
</template>

<script>
export default {
  mounted() {
    nodecg.listenFor("unlockAchievement", this.unlockAchievement);
  },

  data() {
    return {
      achievements: [],
    };
  },

  methods: {
    unlockAchievement(data) {
      nodecg.playSound("Achievement");

      let achievement = {
        id: Math.random(),
        name: data.name,
        description: data.description,
        score: data.score,
        icon: data.icon,
      };

      this.achievements.push(achievement);

      // remove achievement after 12 seconds
      setTimeout(() => {
        this.achievements.splice(this.achievements.indexOf(achievement), 1);
      }, 12000);
    },
  },
};
</script>
