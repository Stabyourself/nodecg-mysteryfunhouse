import { createLogger, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

// One self-contained bundle per entry, picked with --mode (build.mjs runs both):
//   graphics  -> src/js/main.js       -> dist/js/main.js       (no Vuetify)
//   dashboard -> src/js/dashboard.js  -> dist/js/dashboard.js  (Vuetify)
const entries = {
  graphics: 'main',
  dashboard: 'dashboard',
};

// url()s in component styles point at /bundles/.../dist, which only exists once nodecg
// serves it. vite leaves those alone, but says so for every single one
const logger = createLogger();
const warnOnce = logger.warnOnce;
logger.warnOnce = (message, options) => {
  if (message.includes("didn't resolve at build time")) return;
  warnOnce(message, options);
};

export default defineConfig(({ mode }) => {
  const name = entries[mode];
  if (!name) {
    throw new Error(`Unknown mode "${mode}", expected one of: ${Object.keys(entries).join(', ')}`);
  }

  return {
    customLogger: logger,

    // dist/ also holds the images, fonts and models, there is nothing to copy into it
    publicDir: false,

    plugins: [
      // image urls in templates point at /bundles/.../dist and stay as written
      vue({ template: { transformAssetUrls: false } }),
      // auto-imports the Vuetify components used in templates, with our sass settings
      ...(mode === 'dashboard' ? [vuetify({ styles: { configFile: 'src/scss/vuetify-settings.scss' } })] : []),
    ],

    resolve: {
      alias: {
        // the pages put their root component tag inside #app in the html, so Vue has to
        // compile that template in the browser, which needs the build with the compiler
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },

    build: {
      outDir: 'dist',
      // never empty dist/, the assets in there are not build output
      emptyOutDir: false,
      // OBS 32 ships Chromium 127
      target: 'chrome127',
      // one file per entry on purpose (three.js alone is most of main.js)
      chunkSizeWarningLimit: 4000,
      rolldownOptions: {
        // compiling Vuetify's sass takes most of the dashboard build, no need to hear it
        checks: { pluginTimings: false },
        input: { [name]: `src/js/${name}.js` },
        output: {
          // a classic script, so the pages load it like before. the css ends up inside
          // the js and is added to the page when it runs, after the linked stylesheets
          format: 'iife',
          entryFileNames: 'js/[name].js',
          assetFileNames: 'css/[name][extname]',
        },
      },
    },
  };
});
