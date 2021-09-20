// src/main.js

import Vue from 'vue'
import vuetify from './plugins/vuetify' // path to vuetify export

import TwoPlayer from '../components/TwoPlayer.vue';
Vue.component("TwoPlayer", TwoPlayer)
import PlayerName from '../components/PlayerName.vue';
Vue.component("PlayerName", PlayerName)
import PlayerDoneSlider from '../components/PlayerDoneSlider.vue';
Vue.component("PlayerDoneSlider", PlayerDoneSlider)
import TwitchPlayer from '../components/TwitchPlayer.vue';
Vue.component("TwitchPlayer", TwitchPlayer)
import Timer from '../components/Timer.vue';
Vue.component("Timer", Timer)
import GameBox from '../components/GameBox.vue';
Vue.component("GameBox", GameBox)
import Rainwave from '../components/Rainwave.vue';
Vue.component("Rainwave", Rainwave)

import FitText from './plugins/vue-fit-text/index.js';
Vue.use(FitText);



new Vue({
    vuetify,
}).$mount('#app')
