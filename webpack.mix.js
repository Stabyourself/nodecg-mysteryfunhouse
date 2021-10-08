const mix = require('laravel-mix');
require('vuetifyjs-mix-extension')

mix
    .js('src/js/main.js', "dist/js")
    .sass('src/scss/style.scss', "dist/css")

    .sourceMaps(false)
    .vuetify('vuetify-loader', 'src/scss/vuetify-variables.scss')
    .vue()
    .options({
        processCssUrls: false
    })
    .disableNotifications();
