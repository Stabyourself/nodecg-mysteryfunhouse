// webpack.config.js

const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        path: __dirname + "/shared",
        filename: 'main.js',
    },
    module: {
      rules: [
        {
            test: /\.css$/,
            use: [
                'style-loader',
                'css-loader'
            ]
        },
        {
            test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
            loader: 'file-loader'
        },
        {
          test: /\.s(c|a)ss$/,
          use: [
            'vue-style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              // Requires sass-loader@^7.0.0
              options: {
                implementation: require('sass'),
                indentedSyntax: true // optional
              },
              // Requires >= sass-loader@^8.0.0
              options: {
                implementation: require('sass'),
                sassOptions: {
                  indentedSyntax: true // optional
                },
              },
            },
          ],
        },
        {
            test: /\.vue$/,
            loader: 'vue-loader'
        }
      ],
    },

    resolve: {
        alias: {
            vue: 'vue/dist/vue.js'
        },
    },

    plugins: [
        // make sure to include the plugin!
        new VueLoaderPlugin()
    ]
  }