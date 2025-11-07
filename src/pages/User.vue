<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const router = useRouter()

const users = ref<{ id: string; username: string }[]>([])
const newUserName = ref('')
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/users`)
    if (!res.ok) throw new Error('Failed to load users')
    const data = await res.json()
    users.value = Array.isArray(data.data) ? data.data : []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function createUser() {
  const name = newUserName.value.trim()
  if (!name) return
  
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name })
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create user')
    
    users.value.push(json.data)
    newUserName.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function selectUser(user: { id: string; username: string }) {
  localStorage.setItem('userId', user.id)
  localStorage.setItem('userName', user.username)
  router.push('/boards')
}

onMounted(loadUsers)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 p-6">
    <div class="max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6 space-y-6">
      <h1 class="text-2xl font-bold text-center text-slate-900 dark:text-slate-100">
        User Selection
      </h1>

      <form @submit.prevent="createUser" class="flex gap-2">
        <input
          v-model="newUserName"
          type="text"
          placeholder="New username"
          class="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          :disabled="!newUserName.trim() || loading"
        >
          Create
        </button>
      </form>

      <div v-if="loading" class="text-slate-500 text-center">
        Loading...
      </div>

      <div v-else>
        <h2 class="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Existing Users
        </h2>
        <div v-if="users.length" class="space-y-2 max-h-60 overflow-y-auto">
          <button
            v-for="user in users"
            :key="user.id"
            @click="selectUser(user)"
            class="w-full text-left px-4 py-2 rounded-lg bg-gray-200 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            {{ user.username }}
          </button>
        </div>
        <p v-else class="text-sm text-slate-500">No users yet</p>
      </div>
    </div>
  </div>
</template>