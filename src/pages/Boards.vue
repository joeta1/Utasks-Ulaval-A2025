<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const router = useRouter()

const userId = localStorage.getItem('userId')
const userName = localStorage.getItem('userName')

if (!userId) router.push('/')

const boards = ref<{ id: string; name: string }[]>([])
const newBoardName = ref('')
const loading = ref(false)

async function loadBoards() {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/boards/user/${userId}`)
    if (!res.ok) throw new Error('Failed to load boards')
    const json = await res.json()
    boards.value = Array.isArray(json.data) ? json.data : []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function createBoard() {
  const name = newBoardName.value.trim()
  if (!name) return
  
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId })
    })
    if (!res.ok) throw new Error('Failed to create board')
    const json = await res.json()
    boards.value.push(json.data)
    newBoardName.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openBoard(boardId: string) {
  router.push(`/boards/${boardId}`)
}

function logout() {
  localStorage.clear()
  router.push('/')
}

onMounted(loadBoards)
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
    <div class="max-w-4xl mx-auto">
      <header class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Hello, {{ userName || 'User' }}
          </h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm">
            Your boards
          </p>
        </div>
        <button
          @click="logout"
          class="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
        >
          Logout
        </button>
      </header>

      <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md mb-8">
        <form @submit.prevent="createBoard" class="flex gap-2">
          <input
            v-model="newBoardName"
            type="text"
            placeholder="New board name"
            class="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            :disabled="!newBoardName.trim() || loading"
          >
            Add
          </button>
        </form>
      </div>

      <div v-if="loading" class="text-center text-slate-500">Loading...</div>

      <div v-else>
        <div v-if="boards.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="board in boards"
            :key="board.id"
            @click="openBoard(board.id)"
            class="p-5 rounded-xl bg-gray-200 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer transition"
          >
            <h3 class="font-semibold text-lg text-slate-800 dark:text-slate-100">
              {{ board.name }}
            </h3>
          </div>
        </div>
        <p v-else class="text-center text-slate-500 mt-4">No boards yet</p>
      </div>
    </div>
  </div>
</template>
