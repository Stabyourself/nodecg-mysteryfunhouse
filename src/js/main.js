// src/main.js

const _ = require("lodash")
import Vue from 'vue'
import vuetify from './vuetify' // path to vuetify export

import VueTilt from 'vue-tilt.js'
Vue.use(VueTilt)

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

new Vue({
    vuetify,
}).$mount('#app')
