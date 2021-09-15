// src/main.js

import Vue from 'vue'
import vuetify from './plugins/vuetify' // path to vuetify export

Vue.component("GeneralOptions", () => import("./components/GeneralOptions.vue"))
Vue.component("TimerOptions", () => import("./components/TimerOptions.vue"))
Vue.component("PlayerOptions", () => import("./components/PlayerOptions.vue"))

Vue.component("TwoPlayer", () => import("./components/TwoPlayer.vue"))

new Vue({
  vuetify,
}).$mount('#app')
