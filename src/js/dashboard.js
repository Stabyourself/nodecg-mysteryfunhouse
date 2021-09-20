// src/main.js

const _ = require("lodash")
import Vue from 'vue'
import vuetify from './plugins/vuetify' // path to vuetify export


const requireComponent = require.context('./', true, /\.vue$/i)

requireComponent.keys().forEach(fileName => {
    // Get component config
    const componentConfig = requireComponent(fileName)

    // Get PascalCase name of component
    const componentName = _.upperFirst(
        _.camelCase(
        // Gets the file name regardless of folder depth
        fileName
            .split('/')
            .pop()
            .replace(/\.\w+$/, '')
        )
    )

    // Register component globally
    Vue.component(
        componentName,
        componentConfig.default || componentConfig
    )
})

import FitText from './plugins/vue-fit-text/index.js';
Vue.use(FitText);

new Vue({
    vuetify,
}).$mount('#app')
