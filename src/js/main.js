// Graphics entry point. Registers every component EXCEPT the dashboard ones (see
// dashboard.js) so broadcast graphics pages don't have to load dashboard-only code
// (Vuetify forms, vue-drag-resize, vue-tilt), and dashboard panels don't have to load
// graphics-only code (three.js scenes, tween.js, markdown-it-vue).
// Import the individual lodash functions rather than the whole library, so the rest of
// lodash doesn't end up in the bundle just for these two.
const upperFirst = require('lodash/upperFirst');
const camelCase = require('lodash/camelCase');
import Vue from 'vue';
import vuetify from './vuetify'; // path to vuetify export

const requireComponent = require.context('./', true, /^(?!.*\/dashboard\/).*\.vue$/i);

requireComponent.keys().forEach((fileName) => {
  // Get component config
  const componentConfig = requireComponent(fileName);

  // Get PascalCase name of component
  const componentName = upperFirst(
    camelCase(
      // Gets the file name regardless of folder depth
      fileName
        .split('/')
        .pop()
        .replace(/\.\w+$/, ''),
    ),
  );

  // Register component globally
  Vue.component(componentName, componentConfig.default || componentConfig);
});

new Vue({
  vuetify,
}).$mount('#app');
