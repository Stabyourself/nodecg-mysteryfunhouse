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
import ImageSelector from '../components/ImageSelector.vue';
Vue.component("ImageSelector", ImageSelector)

import TwitchPlayer from '../components/TwitchPlayer.vue';
Vue.component("TwitchPlayer", TwitchPlayer)

import VueDragResize from '../components/vue-drag-resize/vue-drag-resize.vue';
Vue.component("VueDragResize", VueDragResize)

new Vue({
  vuetify,
}).$mount('#app')
