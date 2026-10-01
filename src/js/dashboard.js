// Dashboard entry point. Registers only the dashboard panels plus the handful of
// shared components they use (see main.js for the graphics entry point), so dashboard
// panels don't have to load graphics-only code (three.js scenes, tween.js,
// markdown-it).
// Import the individual lodash functions rather than the whole library, so the rest of
// lodash doesn't end up in the bundle just for these two.
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import { createApp } from 'vue';
import VanillaTilt from 'vanilla-tilt';
import vuetify from './vuetify'; // path to vuetify export
import '../scss/dashboard.scss';

import TwitchPlayer from './components/TwitchPlayer.vue';
import PlayerCard from './components/PlayerCard.vue';
import VueDragResize from './components/vue-drag-resize.vue';

// the root component of each panel is the tag inside #app in its html
const app = createApp({});

app.use(vuetify);

// v-tilt, tilts the element towards the mouse
app.directive('tilt', {
  mounted(el, binding) {
    VanillaTilt.init(el, binding.value);
  },

  unmounted(el) {
    if (el.vanillaTilt) el.vanillaTilt.destroy();
  },
});

function registerComponent(fileName, component) {
  // Get PascalCase name of component, regardless of folder depth
  const componentName = upperFirst(camelCase(fileName.split('/').pop().replace(/\.\w+$/, '')));

  app.component(componentName, component);
}

const dashboardComponents = import.meta.glob('./components/dashboard/*.vue', { eager: true });

for (const [fileName, component] of Object.entries(dashboardComponents)) {
  registerComponent(fileName, component.default);
}

// Components outside components/dashboard that dashboard panels also use directly.
registerComponent('TwitchPlayer.vue', TwitchPlayer);
registerComponent('PlayerCard.vue', PlayerCard);
registerComponent('VueDragResize.vue', VueDragResize);

app.mount('#app');
