<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BoardsItem from '../components/BoardsItem.vue'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const router = useRouter()

const userId = localStorage.getItem('userId')
const userName = localStorage.getItem('userName')

if (!userId) router.push('/')

const boards = ref<{ id: string; name: string }[]>([])
const newBoardName = ref('')
const loading = ref(false)
const editingBoard = ref<{ id: string; name: string } | null>(null)

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
  // Add a new board
  const name = newBoardName.value.trim()
  if (!name) return

  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ name, userId })
    })
    const json = await res.json()

    if (!res.ok || json.success === false) {
      let message = 'Unknown error'

      switch (res.status) {
        case 400:
          message = json.error || 'Invalid input'
          break
        case 404:
          message = json.error || 'User not found'
          break
        case 500:
          message = Array.isArray(json.errors)
            ? json.errors.map(e => e.message).join(', ')
            : json.error || 'Internal server error'
          break
        default:
          message = json.error || json.message || message
      }

      throw new Error(message)
    }

    boards.value.push(json.data)
    newBoardName.value = ''
  } catch (err: any) {
    console.error(err)
    alert(err.message)
  } finally {
    loading.value = false
  }
}

async function updateBoard(boardId: string, name: string) {
  if (!name.trim()) return

  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) throw new Error('Failed to update board')
    const board = boards.value.find(b => b.id === boardId)
    if (board) {
      board.name = name
      editingBoard.value = null
    }
  } catch (err) {
    console.error(err)
    alert('Failed to update board')
  }
}

async function deleteBoard(boardId: string, boardName: string) {
  // Ask for confirmation before deleting a board
  if (!confirm(`Delete board "${boardName}"?`)) return

  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete board')
    boards.value = boards.value.filter(b => b.id !== boardId)
  } catch (err) {
    console.error(err)
    alert('Failed to delete board')
  }
}

function openBoard(boardId: string) {
  // Navigate to the selected board's page
  router.push(`/boards/${boardId}`)
}

async function logout() {
  // Handle logout by optionally deleting the user then clearing local storage
  const userId = localStorage.getItem('userId')
  const userName = localStorage.getItem('userName')

  if (!userId) {
    router.push('/')
    return
  }

  if (!confirm(`Delete user "${userName}" before logout?`)) return

  try {
    const res = await fetch(`${apiBase}/api/users/${userId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete user')

    localStorage.clear()
    alert(`User "${userName}" deleted successfully.`)
  } catch (err: any) {
    console.error(err)
    alert(err.message)
  } finally {
    router.push('/')
  }
}
// Load the boards when the component is mounted
onMounted(loadBoards)
</script>

<template>
  <!-- Boards page container -->
  <div
    class="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header with welcome message and logout button -->
      <header class="mb-8">
        <div
          class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-slate-700">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 class="text-3xl md:text-4xl font-bold  text-slate-900 dark:text-slate-100 bg-clip-text ">
                Welcome, {{ userName || 'User' }}!
              </h1>
              <p class="text-slate-600 dark:text-slate-400 mt-1">
                Manage your boards however you like.
              </p>
            </div>
            <button id="logout-button" type="button" @click="logout"
              class="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition transform hover:scale-105 shadow-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Form to create a new board -->
      <div
        class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-xl p-5 shadow-lg mb-8 border border-gray-200 dark:border-slate-700">
        <form @submit.prevent="createBoard" class="flex gap-3">
          <div class="flex-1 relative">
            <label for="new-board-name" class="sr-only">Board name</label>
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <input id="new-board-name" v-model="newBoardName" type="text" placeholder="Create a new board..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
          </div>
          <button id="create-board-button" type="submit"
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition transform hover:scale-105 flex items-center gap-2"
            :disabled="!newBoardName.trim() || loading">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Board
          </button>
        </form>
      </div>

      <!-- Loading indicator when boards are being fetched -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
        <p class="text-slate-500 mt-4 font-medium">Loading your boards...</p>
      </div>

      <div v-else>
        <!-- Grid of existing boards -->
        <div v-if="boards.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <BoardsItem v-for="board in boards" :key="board.id" :board="board" @open="openBoard" @update="updateBoard"
            @delete="deleteBoard" />
        </div>

        <div v-else class="text-center py-16">
          <div class="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-12 max-w-md mx-auto">
            <h2 class="text-6xl font-semibold text-slate-700 dark:text-slate-300 mb-6">Oops!</h2>
            <h3 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No boards yet</h3>
            <p class="text-slate-500 dark:text-slate-400">Create your first board to get started!</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>