<template>
  <div id="app">
    <Navigation></Navigation>
    <router-view></router-view>
    <ChatWidget v-if="isAuthenticated"></ChatWidget>
    <AppFooter></AppFooter>
    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import authStore from './stores/auth'
import Navigation from './components/Navigation.vue'
import AppFooter from './components/AppFooter.vue'
import ChatWidget from './components/ChatWidget.vue'

const isAuthenticated = computed(() => authStore.isAuthenticated.value)
</script>

<style></style>
