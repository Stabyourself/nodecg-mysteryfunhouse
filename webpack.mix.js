const mix = require('laravel-mix');
require('vuetifyjs-mix-extension')


mix
    .js('src/js/graphics.js', "graphics/js")
    .sass('src/scss/graphics.scss', "graphics/css")
    .js('src/js/dashboard.js', "dashboard/js")
    .sass('src/scss/dashboard.scss', "dashboard/css")

    .sourceMaps()
    .vuetify('vuetify-loader', 'src/scss/vuetify-variables.scss')
    .vue()
    .options({
        processCssUrls: false
    })
    .disableNotifications();
