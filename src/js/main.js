// Graphics entry point. Registers every component EXCEPT the dashboard ones (see
// dashboard.js) so broadcast graphics pages don't have to load dashboard-only code
// (Vuetify), and dashboard panels don't have to load graphics-only code (three.js
// scenes, tween.js, markdown-it).
// Import the individual lodash functions rather than the whole library, so the rest of
// lodash doesn't end up in the bundle just for these two.
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import { createApp } from 'vue';
import '../scss/graphics-legacy.css';

// the root component of each page is the tag inside #app in its html
const app = createApp({});

const components = import.meta.glob(['./components/**/*.vue', '!./components/dashboard/**'], { eager: true });

for (const [fileName, component] of Object.entries(components)) {
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
  app.component(componentName, component.default);
}

app.mount('#app');
