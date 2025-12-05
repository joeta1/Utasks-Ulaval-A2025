<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const router = useRouter()

const newUserName = ref('')
const loading = ref(false)

async function createUser() {
  const name = newUserName.value.trim()
  if (!name) return
  loading.value = true

  try {
    const res = await fetch(`${apiBase}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ username: name })
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      const message =
        json.errors?.[0]?.message ||
        json.error ||
        json.message ||
        'Unknown error'
      throw new Error(message)
    }

    const user = json.data

    localStorage.setItem('userId', user.id)
    localStorage.setItem('userName', user.username)

    router.push('/boards')
  } catch (err) {
    alert(err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- User registration page container -->
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-gray-100 to-white dark:from-black dark:via-gray-900 dark:to-black p-4 md:p-6">
    <div class="max-w-lg w-full text-center">
      <!-- Icon/branding container -->
      <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-2xl shadow-2xl mb-6">
        <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>

      <!-- Page title and description -->
      <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        Organize your tasks everywhere
      </h1>
      <p class="text-slate-600 dark:text-slate-400 mb-8">
        Create your username to start using UTasks.
      </p>

      <!-- Registration form with username input and submit button -->
      <form @submit.prevent="createUser" class="flex flex-col sm:flex-row gap-3 justify-center">
        <div class="flex-1 relative max-w-sm">
          <label for="username" class="sr-only">Username</label>
          <input id="username" autocomplete="username" v-model="newUserName" type="text"
            placeholder="Enter your username..."
            class="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <!-- Submit button to create the user -->
        <button id="submit-create-user" type="submit"
          class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg transition transform hover:scale-105 w-full sm:w-auto"
          :disabled="!newUserName.trim() || loading">
          Create
        </button>
      </form>
    </div>
  </div>
</template>