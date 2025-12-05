<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../services/api'

const router = useRouter()

const isDark = ref(
  window.matchMedia('(prefers-color-scheme: dark)').matches ||
  document.documentElement.classList.contains('dark')
)

import authStore from '../stores/auth'

const isAuthenticated = computed(() => authStore.isAuthenticated.value)
const userName = computed(() => authStore.currentUser.value?.username || '')

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

async function logout() {
  await authApi.logout()
  // Ensure store is cleared and force a full reload so browser autofill doesn't retain values
  try {
    authStore.clearAuth()
  } catch (e) {
    // ignore
  }
  router.push('/login')
  // reload the page to clear any browser-autofilled inputs
  window.location.reload()
}
</script>

<template>
  <header class="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 shadow-sm">
    <!-- Left Logo -->
    <div class="flex items-center gap-2">
      <router-link to="/boards" class="flex items-center gap-2 hover:opacity-80 transition">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <span class="font-semibold text-slate-800 dark:text-slate-100 text-lg">UTasks</span>
      </router-link>
    </div>

    <!-- Right side: User info and logout -->
    <div v-if="isAuthenticated" class="flex items-center gap-4">
      <span class="text-slate-600 dark:text-slate-400 text-sm">
        Hello, <span class="font-medium text-slate-800 dark:text-slate-200">{{ userName }}</span>
      </span>
      <button
        @click="logout"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
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