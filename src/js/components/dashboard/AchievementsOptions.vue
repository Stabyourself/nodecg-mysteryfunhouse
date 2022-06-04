<template>
  <v-app>
    <v-main>
      <v-container>
        <v-text-field
          v-model="filter"
          label="Filter"
          prepend-icon="mdi-magnify"
        ></v-text-field>
        <div class="button-holder">
          <v-btn
            x-small
            class="mb-2"
            v-for="(achievement, index) in achievementsFiltered"
            :key="index"
            block
            color="primary"
            @click="unlockAchievement(achievement)"
          >
            {{ achievement }}
          </v-btn>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.button-holder {
  max-height: 300px;
  overflow-y: scroll;
  overflow-x: hidden;
}

.button-holder button {
  max-width: 100%;
}
</style>

<script>
export default {
  computed: {
    achievementsFiltered() {
      return this.achievements.filter((achievement) => {
        return achievement.toLowerCase().includes(this.filter.toLowerCase());
      });
    },
  },

  methods: {
    unlockAchievement(achievement) {
      let data = {
        name: "Bingo Square Completed",
        description: achievement,
        score: 100,
        icon: "mdi-ghost",
      };

      nodecg.sendMessage("unlockAchievement", data);
    },
  },

  data() {
    return {
      filter: "",
      achievements: [
        "No saving",
        "Buy 3 items from a shop",
        "Defeat an enemy using only punches",
        "Obtain 3 extra lives",
        "Defeat a knight",
        "Defeat an enemy using only kicks",
        "Complete an autoscroll section",
        "Obtain a potion",
        "Do a dance",
        "Touch a cloud",
        "Defeat a zombie/mummy",
        "Climb to the summit of a mountain",
        "Complete a prologue/tutorial",
        "Barrel roll",
        "Collect 100 yellow/golden items",
        "Obtain a card",
        "Drain an enemy bar",
        "Complete a bonus/special stage",
        "Defeat 15 unique enemies",
        "Defeat a spider",
        "Obtain a fruit",
        "Level up to 4",
        "Defeat a bat",
        "Enter a forest/jungle",
        "Enter a castle",
        "Enter a desert",
        "Talk to royalty",
        "Talk to a scientist",
        "New partner or party member",
        "Enter a snowy/icy area",
        "Ride an animal",
        "New vehicle",
        "Become poisoned",
        "Restore an ally's health",
        "Melee weapon upgrade",
        "Win a race",
        "Enter an inn/hotel",
        "Disturb the bees",
        "Defeat a slime",
        "Use a key",
        "Escape from prison",
        "Destroy an enemy vehicle",
        "Enter strong wind currents",
        "Obtain a new hat",
        "Obtain an explosive",
        "Enter a volcano",
        "Don't shoot",
        "Armor/Defense upgrade",
        "Get shocked by electricity",
        "Learn an ability involving magic",
        "Obtain a hammer",
        "Defeat a boss",
        "Play an instrument/song",
        "Take damage from your own attack",
        "Boots/Shoes upgrade",
        "Enter outer space",
        "Go through a floating ring",
        "Light a fire",
        "Ride an electric elevator",
        "Catch a thief/criminal",
        "Read a book",
        "Defeat a snake or worm",
        "Learn an ability involving water",
        "Get covered in goo or mud",
        "Ranged weapon upgrade",
        "100k points",
        "Hit a target",
        "Collect letters to spell a word",
        "Learn a password",
        "Increase max health",
        "Defeat a floating hand",
        "Obtain an area map",
        "Interact with a friendly cat or dog",
        "Buy 5 unique items from a shop",
        "Learn an ability involving fire",
        "Ride a snowboard",
        "Complete a rollercoaster/minecart ride",
        "Complete a stealth section",
        "Rescue an NPC",
        "Ride a boat/raft",
        "Defeat an insect boss",
        "Defeat a ghost",
        "Defeat a king",
        "Capture an insect or fish",
        "Complete a world",
        "Learn how to shrink",
        "Stun an enemy",
        "Defeat an enemy with a super or ultra attack",
        "Outrun a large rolling object",
        "Put on a disguise",
        "Defeat a shapeshifter",
        "Defeat your rival/dark-side",
        "Glitch out of bounds",
        "Ride a flying animal",
        "Ride a train",
        "Obtain ability to warp",
        "Learn how to dig",
        "Utilize a bubble",
        "Break the ice",
        "Manipulate time",
        "Change the water level",
        "Turn invisible",
        "Craft a weapon or armor",
        "Transform into an animal",
        "Flip gravity",
        "Defeat a vampire",
        "Defeat three bosses",
        "Revive a character",
        "Pass through a fake wall/floor",
        "Obtain the ability to swim or walk underwater",
        "Turn the lights on",
        "Gain control of an enemy",
        "Learn an ability involving wind",
        "Cook food",
        "Defeat a dragon",
        "New playable character",
        "No jumping",
        "Pacifism",
        "Transition into having 100 HP",
        "Win a tournament",
        "Beat a game",
      ],
    };
  },
};
</script>
