// src/main.js

import Vue from 'vue'

import TwoPlayer from '../components/TwoPlayer.vue';
Vue.component("TwoPlayer", TwoPlayer)

import PlayerName from '../components/PlayerName.vue';
Vue.component("PlayerName", PlayerName)

import FitText from '../plugins/vue-fit-text/index.js';
Vue.use(FitText);

new Vue({

}).$mount('#app')
