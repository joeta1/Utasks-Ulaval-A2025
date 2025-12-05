<template>
  <div id="app">
    <Navigation></Navigation>
    <router-view></router-view>
    <AppFooter></AppFooter>
    
  </div>
</template>

<script setup>
import Navigation from './components/Navigation.vue'
import AppFooter from './components/AppFooter.vue'
</script>

<style></style>
