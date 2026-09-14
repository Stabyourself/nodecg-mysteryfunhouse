// Dashboard entry point. Registers only the dashboard panels plus the handful of
// shared components they use (see main.js for the graphics entry point), so dashboard
// panels don't have to load graphics-only code (three.js scenes, tween.js, vue-tilt,
// markdown-it-vue).
// Import the individual lodash functions rather than the whole library, so the rest of
// lodash doesn't end up in the bundle just for these two.
const upperFirst = require('lodash/upperFirst');
const camelCase = require('lodash/camelCase');
import Vue from 'vue';
import vuetify from './vuetify'; // path to vuetify export

import VueTilt from 'vue-tilt.js';
Vue.use(VueTilt);

function registerComponent(fileName, componentConfig) {
  // Get PascalCase name of component, regardless of folder depth
  const componentName = upperFirst(camelCase(fileName.split('/').pop().replace(/\.\w+$/, '')));

  Vue.component(componentName, componentConfig.default || componentConfig);
}

const dashboardComponents = require.context('./components/dashboard', false, /\.vue$/i);
dashboardComponents.keys().forEach((fileName) => registerComponent(fileName, dashboardComponents(fileName)));

// Components outside components/dashboard that dashboard panels also use directly.
registerComponent('TwitchPlayer.vue', require('./components/TwitchPlayer.vue'));
registerComponent('PlayerCard.vue', require('./components/PlayerCard.vue'));
registerComponent('VueDragResize.vue', require('./components/vue-drag-resize.vue'));

new Vue({
  vuetify,
}).$mount('#app');
