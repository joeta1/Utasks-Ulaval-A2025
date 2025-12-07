<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import authStore from '../stores/auth'
import { useRouter } from 'vue-router'
import BoardsItem from '../components/BoardsItem.vue'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const router = useRouter()

const userId = computed(() => authStore.currentUser.value?.id)
const userName = computed(() => authStore.currentUser.value?.username)

// redirect to login if the user logs out
if (!userId.value) router.push('/')
watch(userId, (val) => {
  if (!val) router.push('/')
})

const boards = ref<{ id: string; name: string }[]>([])
const newBoardName = ref('')
const loading = ref(false)
const editingBoard = ref<{ id: string; name: string } | null>(null)
const showSettingsModal = ref(false)

async function loadBoards() {
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/boards/user/${userId.value}`)
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
      body: JSON.stringify({ name, userId: userId.value })
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

async function deleteAccount() {
  const confirmed = confirm(
    `Are you sure you want to delete your account?\n\nThis action is IRREVERSIBLE and will:\n- Delete all your boards\n- Remove all your data\n- Log you out immediately\n\nType "DELETE" in the next prompt to confirm.`
  )
  
  if (!confirmed) return
  
  const confirmText = prompt('Type "DELETE" to confirm account deletion:')
  if (confirmText !== 'DELETE') {
    alert('Account deletion cancelled.')
    return
  }
  
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${apiBase}/api/users/${userId.value}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to delete account')
    }
    
    // Logout and redirect
    authStore.clearAuth()
    alert('Your account has been successfully deleted.')
    router.push('/')
  } catch (err: any) {
    console.error(err)
    alert(err.message || 'Failed to delete account')
  } finally {
    loading.value = false
    showSettingsModal.value = false
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
            
            <button
              @click="showSettingsModal = true"
              class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                <path d="M19.4 4.6l-4.24 4.24m-6.36 0L4.6 4.6m14.8 14.8l-4.24-4.24m-6.36 0L4.6 19.4"></path>
              </svg>
              Settings
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
    
    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showSettingsModal = false">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6" @click.stop>
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            @click="showSettingsModal = false"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h3 class="font-semibold text-slate-900 dark:text-slate-100 mb-2">Account Information</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">Username: <span class="font-medium">{{ userName }}</span></p>
            <p class="text-sm text-slate-600 dark:text-slate-400">User ID: <span class="font-mono text-xs">{{ userId }}</span></p>
          </div>
          
          <div class="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 class="font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              @click="deleteAccount"
              :disabled="loading"
              class="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              {{ loading ? 'Deleting...' : 'Delete Account' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>