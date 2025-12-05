<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../services/api'

const router = useRouter()

const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const email = ref('')
const loading = ref(false)
const error = ref('')

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  error.value = ''
}

const isFormValid = computed(() => {
  if (isLoginMode.value) {
    return username.value.trim() && password.value.trim()
  }
  return username.value.trim() && 
         password.value.trim() && 
         password.value.length >= 6 &&
         password.value === confirmPassword.value
})

async function handleSubmit() {
  if (!isFormValid.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    if (isLoginMode.value) {
      await authApi.login(username.value.trim(), password.value)
    } else {
      if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match'
        return
      }
      await authApi.register(
        username.value.trim(), 
        password.value, 
        email.value.trim() || null
      )
    }
    router.push('/boards')
  } catch (err: any) {
    error.value = err.message || 'An error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-gray-100 to-white dark:from-black dark:via-gray-900 dark:to-black p-4 md:p-6">
    <div class="max-w-md w-full">
      <!-- Icon/branding container -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-2xl shadow-2xl mb-6">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {{ isLoginMode ? 'Welcome back!' : 'Create an account' }}
        </h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">
          {{ isLoginMode ? 'Sign in to access your tasks' : 'Start organizing your tasks' }}
        </p>
      </div>

      <!-- Login/Register Form -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Error message -->
          <div v-if="error" class="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {{ error }}
          </div>

          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Username
            </label>
            <input 
              id="username" 
              v-model="username" 
              type="text" 
              autocomplete="username"
              placeholder="Enter your username"
              class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <!-- Email (register only) -->
          <div v-if="!isLoginMode">
            <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email <span class="text-slate-400">(optional)</span>
            </label>
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              autocomplete="email"
              placeholder="Enter your email"
              class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              autocomplete="current-password"
              placeholder="Enter your password"
              class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p v-if="!isLoginMode" class="text-xs text-slate-500 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <!-- Confirm Password (register only) -->
          <div v-if="!isLoginMode">
            <label for="confirmPassword" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <input 
              id="confirmPassword" 
              v-model="confirmPassword" 
              type="password" 
              autocomplete="new-password"
              placeholder="Confirm your password"
              class="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <!-- Submit button -->
          <button 
            type="submit"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            :disabled="!isFormValid || loading"
          >
            <span v-if="loading">Loading...</span>
            <span v-else>{{ isLoginMode ? 'Sign In' : 'Create Account' }}</span>
          </button>
        </form>

        <!-- Toggle mode -->
        <div class="mt-6 text-center">
          <p class="text-slate-600 dark:text-slate-400">
            {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
            <button 
              @click="toggleMode"
              class="text-blue-600 hover:text-blue-700 font-medium ml-1"
            >
              {{ isLoginMode ? 'Sign Up' : 'Sign In' }}
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
