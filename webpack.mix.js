const mix = require('laravel-mix');
require('vuetifyjs-mix-extension')

mix
    .js('src/js/main.js', "res/js")
    .sass('src/scss/style.scss', "res/css")

    .sourceMaps()
    .vuetify('vuetify-loader', 'src/scss/vuetify-variables.scss')
    .vue()
    .options({
        processCssUrls: false
    })
    .disableNotifications();
