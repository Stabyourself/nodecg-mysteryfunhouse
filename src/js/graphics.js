// src/main.js

import Vue from 'vue'

import TwoPlayer from '../components/TwoPlayer.vue';
Vue.component("TwoPlayer", TwoPlayer)

import PlayerName from '../components/PlayerName.vue';
Vue.component("PlayerName", PlayerName)

import FitText from './plugins/vue-fit-text/index.js';
Vue.use(FitText);

import Timer from '../components/Timer.vue';
Vue.component("Timer", Timer)

import TwitchPlayer from '../components/TwitchPlayer.vue';
Vue.component("TwitchPlayer", TwitchPlayer)

new Vue({

}).$mount('#app')
