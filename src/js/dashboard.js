// src/main.js

import Vue from 'vue'
import vuetify from './plugins/vuetify' // path to vuetify export

import GeneralOptions from '../components/GeneralOptions.vue';
Vue.component("GeneralOptions", GeneralOptions)
import TimerOptions from '../components/TimerOptions.vue';
Vue.component("TimerOptions", TimerOptions)
import PlayerOptions from '../components/PlayerOptions.vue';
Vue.component("PlayerOptions", PlayerOptions)
import Cropping from '../components/Cropping.vue';
Vue.component("Cropping", Cropping)
import PlayerCropping from '../components/PlayerCropping.vue';
Vue.component("PlayerCropping", PlayerCropping)

new Vue({
  vuetify,
}).$mount('#app')
