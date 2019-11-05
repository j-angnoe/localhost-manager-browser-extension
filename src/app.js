import Vue from 'vue/dist/vue.common';
import VueRouter from 'vue-router';

import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css
// import './bootstrap';
// import './style.css';

window.APP_NAME = 'LocalhostCompagnon';
import App from './app.vue';
import UnableToConnect from './unable-to-connect.vue';
import Settings from './settings.vue';

var routes = [
    {
        "path" : "/unable-to-connect",
        "component": UnableToConnect
    },
    {
        "path" : "/settings",
        "component" : Settings
    }
];

var router = new VueRouter({
    routes
})
Vue.use(VueRouter);

new Vue({
    el: '#app',
    render(h) {
        return h(App);
    },
    router
});
