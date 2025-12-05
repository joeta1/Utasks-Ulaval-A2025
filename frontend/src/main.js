import './assets/main.css'

import { createApp } from 'vue'
import { router } from './router'
import App from './App.vue'
import authStore from './stores/auth'

const app = createApp(App)

app.use(router)

// Initialize reactive auth from localStorage
authStore.initAuthFromStorage()

app.mount('#app')
