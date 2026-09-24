// shared stuff for the tournament layouts (2 player, tate, 4 player)
import { bindReplicant, formatTimer } from './util.js';

const params = new URLSearchParams(window.location.search);

// ?match2 = players 3 and 4
const playerOffset = params.get('match2') != null ? 2 : 0;

// &obsscene=... from the url, the layout animates in when one of these goes on air
const ownScenes = params.getAll('obsscene');

// per player replicants, player<n><field>
const PLAYER_FIELDS = {
  name: '',
  pronouns: '',
  flag: '',
  // see ObsVideo publishAudible
  audible: false,
  raceState: 'none',
  finalTime: '',
};

function onAir(sceneName) {
  return !ownScenes.length || ownScenes.includes(sceneName);
}

export function layoutMixin(playerCount) {
  return {
    created() {
      for (const name of ['game', 'goal', 'platform', 'submitter', 'currentBoxart', 'timer', 'currentEventLogo']) {
        bindReplicant.call(this, name);
      }

      for (let i = 0; i < playerCount; i++) {
        for (const field of Object.keys(PLAYER_FIELDS)) {
          bindReplicant.call(this, `player${i}${field}`, `player${i + playerOffset}${field}`);
        }
      }

      // animate in when our scene goes on air, out when it doesn't. outside obs just animate in
      if (window.obsstudio && window.obsstudio.getCurrentScene) {
        window.obsstudio.getCurrentScene((scene) => {
          this.visible = !scene || onAir(scene.name);
        });

        window.addEventListener('obsSceneChanged', this.onSceneChanged);
      } else {
        setTimeout(() => (this.visible = true), 0);
      }

      document.addEventListener('keyup', this.onKey);
      nodecg.listenFor('playSound', this.playSound);
    },

    beforeDestroy() {
      window.removeEventListener('obsSceneChanged', this.onSceneChanged);
      document.removeEventListener('keyup', this.onKey);
      nodecg.unlisten('playSound', this.playSound);
    },

    methods: {
      onSceneChanged(event) {
        if (event.detail) this.visible = onAir(event.detail.name);
      },

      // enter toggles visibility for testing
      onKey(event) {
        if (event.key === 'Enter') this.visible = !this.visible;
      },

      playSound(data) {
        nodecg.playSound(data.sound);
      },
    },

    computed: {
      timerText() {
        return formatTimer(this.timer.ms, false, false);
      },

      // number is the overall player number, for the videos
      players() {
        const players = [];

        for (let i = 0; i < playerCount; i++) {
          const player = { number: i + playerOffset };

          for (const field of Object.keys(PLAYER_FIELDS)) {
            player[field] = this[`player${i}${field}`];
          }

          players.push(player);
        }

        return players;
      },
    },

    data() {
      const data = {
        game: '',
        goal: '',
        platform: '',
        submitter: '',
        currentBoxart: {},
        timer: { ms: 0 },
        currentEventLogo: {},

        playerOffset,
        visible: false,

        // in obs the telestrator is its own source
        showTelestrator: !window.obsstudio,
      };

      for (let i = 0; i < playerCount; i++) {
        for (const [field, value] of Object.entries(PLAYER_FIELDS)) {
          data[`player${i}${field}`] = value;
        }
      }

      return data;
    },
  };
}
