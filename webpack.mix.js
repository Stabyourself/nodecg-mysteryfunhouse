const mix = require('laravel-mix');
require('vuetifyjs-mix-extension')


mix
    .js('src/js/graphics.js', "graphics/js")
    .sass('src/scss/graphics.scss', "graphics/css")
    .js('src/js/dashboard.js', "dashboard/js")
    .sass('src/scss/dashboard.scss', "dashboard/css")

    .copy('src/scss/font', "graphics/css/font")
    .copy('src/html/graphics', "graphics")
    .copy('src/html/dashboard', "dashboard")


    // .sourceMaps()
    .vuetify('vuetify-loader', 'src/scss/vuetify-variables.scss')
    .vue()
    .options({
        processCssUrls: false
    })
    .disableNotifications();
