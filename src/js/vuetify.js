// src/plugins/vuetify.js

import Vue from "vue";
// The bare "vuetify" package resolves to the fully pre-bundled dist build (every
// component/directive registered, ~80 components). Importing the lean framework core
// instead lets vuetify-loader's webpack plugin (see webpack.mix.js) tree-shake down to
// only the Vuetify components actually used in templates.
import Vuetify from "vuetify/lib/framework";

Vue.use(Vuetify);

const opts = {
  theme: {
    dark: true,
    themes: {
      dark: {
        primary: "#00BEBE",
      },
    },
  },
};

export default new Vuetify(opts);
