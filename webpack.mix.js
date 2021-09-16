const mix = require('laravel-mix');

mix
    .js('src/graphics/graphics.js', "graphics/js")
    .sass('src/graphics/graphics.scss', "graphics/css")
    .js('src/dashboard/dashboard.js', "dashboard/js")
    .sass('src/dashboard/dashboard.scss', "dashboard/css")
    .sourceMaps()
    .vue()
    .options({
        processCssUrls: false
    });
