<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const router = useRouter()

const userId = localStorage.getItem('userId')
const userName = localStorage.getItem('userName')

// Redirect to the login page if there is no current user in local storage
if (!userId) router.push('/')

// Reactive state for the list of boards and form inputs
const boards = ref<{ id: string; name: string }[]>([])
const newBoardName = ref('')
const loading = ref(false)
const editingBoard = ref<{ id: string; name: string } | null>(null)

async function loadBoards() {
  // Fetch all boards for the current user
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
  // Create a new board for the current user
  const name = newBoardName.value.trim()
  if (!name) return
  
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name, userId })
    })
    const json = await res.json()

    // Handle different error response types from the server
    if (!res.ok || json.success === false) {
      let message = 'Unknown error'

      switch (res.status) {
        case 400: // Invalid input or validation error
          message = json.error || 'Invalid input'
          break
        case 404: // User not found
          message = json.error || 'User not found'
          break
        case 500: // Internal server error
          message = Array.isArray(json.errors)
            ? json.errors.map(e => e.message).join(', ')
            : json.error || 'Internal server error'
          break
        default:
          message = json.error || json.message || message
      }

      throw new Error(message)
    }

    // Push the new board into the list
    boards.value.push(json.data)
    newBoardName.value = ''
  } catch (err: any) {
    console.error(err)
    // Display the actual message returned by the server
    alert(err.message)
  } finally {
    loading.value = false
  }
}

async function updateBoard(boardId: string, name: string) {
  // Update an existing board's name
  if (!name.trim()) return
  
  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
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
  <div class="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header with welcome message and logout button -->
      <header class="mb-8">
        <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-slate-700">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 class="text-3xl md:text-4xl font-bold  text-slate-900 dark:text-slate-100 bg-clip-text ">
                Welcome, {{ userName || 'User' }}!
              </h1>
              <p class="text-slate-600 dark:text-slate-400 mt-1">
                Manage your boards however you like.
              </p>
            </div>
            <button id="logout-button"
              type="button"
              @click="logout"
              class="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition transform hover:scale-105 shadow-lg"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Form to create a new board -->
      <div class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-xl p-5 shadow-lg mb-8 border border-gray-200 dark:border-slate-700">
        <form @submit.prevent="createBoard" class="flex gap-3">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <input id="new-board-name"
              v-model="newBoardName"
              type="text"
              placeholder="Create a new board..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <button id="create-board-button"
            type="submit"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition transform hover:scale-105 flex items-center gap-2"
            :disabled="!newBoardName.trim() || loading"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Board
          </button>
        </form>
      </div>

      <!-- Loading indicator when boards are being fetched -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
        <p class="text-slate-500 mt-4 font-medium">Loading your boards...</p>
      </div>

      <div v-else>
        <!-- Grid of existing boards -->
        <div v-if="boards.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Iterate over each board and render a card -->
          <div
            v-for="board in boards"
            :key="board.id"
            class="group relative bg-linear-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-gray-200 dark:border-slate-600 overflow-hidden"
          >
            <div v-if="editingBoard?.id === board.id" class="p-5">
              <input 
                id="edit-board-name"
                v-model="editingBoard.name"
                type="text"
                class="w-full px-3 py-2 mb-3 border border-indigo-500 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keyup.enter="updateBoard(board.id, editingBoard.name)"
                autofocus
              />
              <div class="flex flex-col sm:flex-row gap-2">
                <button id="save-edit-board-button"
                  @click="updateBoard(board.id, editingBoard.name)"
                  class="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Save
                </button>
                <button id="cancel-edit-board-button"
                  @click="editingBoard = null"
                  class="flex-1 px-3 py-2 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            <div v-else>
              <div class="absolute top-0 left-0 w-full h-1  bg-blue-500"></div>
              
              <div class="p-5">
                <div class="flex items-start justify-between mb-3">
                  <div
                    @click="openBoard(board.id)"
                    class="flex-1 cursor-pointer"
                  >
                    <h3 class="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-2">
                      {{ board.name }}
                    </h3>
                  </div>
                  
                  <div class="flex gap-1 ">
                    <button id="edit-board-button"
                      @click="editingBoard = { id: board.id, name: board.name }"
                      class="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition"
                      title="Edit board"
                    >
                      Rename
                    </button>
                    <button id="delete-board-button"
                      @click="deleteBoard(board.id, board.name)"
                      class="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 transition"
                      title="Delete board"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="bg-linear-to-r from-indigo-50 to-purple-50 dark:from-slate-700/50 dark:to-slate-600/50 px-5 py-3 border-t border-gray-200 dark:border-slate-600">
                <button id="open-board-button"
                  @click="openBoard(board.id)"
                  class="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  Click here to Open Board
                </button>
              </div>
            </div>
          </div>
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