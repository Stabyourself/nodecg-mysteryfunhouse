const mix = require("laravel-mix");
require("vuetifyjs-mix-extension");

mix
  .js("src/js/main.js", "dist/js")
  .js("src/js/dashboard.js", "dist/js")
  // Only pull genuinely shared libraries into the common vendor.js. Anything not listed
  // here (three.js, tween.js, vue-tilt.js, vue-drag-resize, markdown-it-vue, ...) stays
  // bundled with whichever entry (main.js or dashboard.js) actually uses it, so dashboard
  // panels don't have to load graphics-only code and vice versa.
  .extract(["vue", "vuetify", "lodash", "clone"])
  .sass("src/scss/style.scss", "dist/css")
  .sass("src/scss/mt20.scss", "dist/css")

  .sourceMaps(false)
  .vuetify("vuetify-loader", "src/scss/vuetify-variables.scss")
  .vue(2)
  .options({
    processCssUrls: false,
  })
  .disableNotifications();
