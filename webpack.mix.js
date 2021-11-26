const mix = require("laravel-mix");
require("vuetifyjs-mix-extension");

mix
  .js("src/js/main.js", "dist/js")
  .extract()
  .sass("src/scss/style.scss", "dist/css")

  .sourceMaps(false)
  .vuetify("vuetify-loader", "src/scss/vuetify-variables.scss")
  .vue(2)
  .options({
    processCssUrls: false,
  })
  .disableNotifications();
