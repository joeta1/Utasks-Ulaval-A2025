<script setup lang="ts">
import { ref } from 'vue'

const isDark = ref(
  window.matchMedia('(prefers-color-scheme: dark)').matches ||
  document.documentElement.classList.contains('dark')
)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <header class="w-full flex items-center px-6 py-4 bg-white dark:bg-slate-900 shadow-sm">
    <!-- Left Logo -->
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <span class="font-semibold text-slate-800 dark:text-slate-100 text-lg">UTasks</span>
    </div>
  </header>
</template>

<style scoped>
header {
  position: sticky;
  top: 0;
  z-index: 50;
}
</style>