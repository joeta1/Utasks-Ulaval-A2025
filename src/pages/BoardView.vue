<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const apiBase = 'https://utasks-026af75f15a3.herokuapp.com'
const route = useRoute()
const router = useRouter()

const boardId = route.params.id as string
const userId = localStorage.getItem('userId')
if (!userId) router.push('/')

const boardName = ref('')
const lists = ref<any[]>([])
const newListName = ref('')
const loading = ref(false)
const editingBoard = ref(false)
const editBoardName = ref('')
const draggedCard = ref<any>(null)
const draggedList = ref<any>(null)
const editingCard = ref<any>(null)
const editingList = ref<any>(null)
const sortBy = ref<'priority' | 'dueDate' | 'priorityAndDueDate' | 'none'>('none')
const dragOverListId = ref<string | null>(null)
const draggingListIndex = ref<number | null>(null)

async function loadBoard() {
  loading.value = true
  try {
    const boardRes = await fetch(`${apiBase}/api/boards/${boardId}`)
    if (!boardRes.ok) throw new Error('Failed to load board')
    const boardPayload = await boardRes.json()
    boardName.value = boardPayload?.data?.name ?? 'Board'

    const listRes = await fetch(`${apiBase}/api/lists/board/${boardId}`)
    if (!listRes.ok) throw new Error('Failed to load lists')
    const listPayload = await listRes.json()
    lists.value = (listPayload?.data ?? []).map(l => ({ ...l, cards: [], _newTitle: '', _newDesc: '', _newDue: '', _newPriority: 2 }))

    for (const list of lists.value) {
      const cardsRes = await fetch(`${apiBase}/api/cards/list/${list.id}`)
      const cardsPayload = cardsRes.ok ? await cardsRes.json() : null
      list.cards = cardsPayload?.data ?? []
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function getSortedCards(cards: any[]) {
  if (sortBy.value === 'none') return cards

  return [...cards].sort((a, b) => {
    if (sortBy.value === 'priority') {
      return (b.priority || 1) - (a.priority || 1)
    } else if (sortBy.value === 'dueDate') {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    else if (sortBy.value === 'priorityAndDueDate') {
      // first sort by descending priority
      const priorityDiff = (b.priority || 1) - (a.priority || 1)
      if (priorityDiff !== 0) return priorityDiff
      // then by ascending due date
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return 0
  })
}

async function updateBoard() {
  const name = editBoardName.value.trim()
  if (!name) return

  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) throw new Error('Failed to update board')
    boardName.value = name
    editingBoard.value = false
  } catch (err) {
    console.error(err)
    alert('Failed to update board')
  }
}

async function deleteBoard() {
  if (!confirm('Delete this board?')) return

  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete board')
    router.push('/boards')
  } catch (err) {
    console.error(err)
    alert('Failed to delete board')
  }
}

async function createList() {
  const name = newListName.value.trim()
  if (!name) return

  try {
    const res = await fetch(`${apiBase}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name, boardId })
    })
    if (!res.ok) throw new Error('Failed to create list')
    const payload = await res.json()
    if (!payload?.success) throw new Error(payload?.error || 'Failed to create list')
    lists.value.push({ ...payload.data, cards: [], _newTitle: '', _newDesc: '', _newDue: '', _newPriority: 2 })
    newListName.value = ''
  } catch (err) {
    console.error(err)
    alert('Failed to create list')
  }
}

async function updateList(listId: string, name: string) {
  if (!name.trim()) return

  try {
    const res = await fetch(`${apiBase}/api/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ name, boardId })
    })
    if (!res.ok) throw new Error('Failed to update list')
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      Object.assign(list, { name })
      editingList.value = null
    }
  } catch (err) {
    console.error(err)
    alert('Failed to update list')
  }
}

async function deleteList(listId: string) {
  if (!confirm('Delete this list and all its cards?')) return

  try {
    const res = await fetch(`${apiBase}/api/lists/${listId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete list')
    lists.value = lists.value.filter(l => l.id !== listId)
  } catch (err) {
    console.error(err)
    alert('Failed to delete list')
  }
}

async function createCard(listId: string, title: string, description = '', dueDate?: string, priority = 2) {
  if (!title.trim()) return

  try {
    const res = await fetch(`${apiBase}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        title,
        description,
        listId,
        dueDate: dueDate || null,
        priority
      })
    })
    const payload = await res.json()
    if (!res.ok || !payload?.success) throw new Error(payload?.message || 'Failed to create card')
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      list.cards.push(payload.data)
      list._newTitle = ''
      list._newDesc = ''
      list._newDue = ''
      list._newPriority = 2
    }
  } catch (err) {
    console.error(err)
    alert('Failed to create card')
  }
}

async function updateCard(cardId: string, updates: any) {
  try {
    const res = await fetch(`${apiBase}/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(updates)
    })
    if (!res.ok) throw new Error('Failed to update card')
    const payload = await res.json()

    for (const list of lists.value) {
      const cardIndex = list.cards.findIndex((c: any) => c.id === cardId)
      if (cardIndex !== -1) {
        list.cards[cardIndex] = { ...list.cards[cardIndex], ...updates }
        break
      }
    }
    editingCard.value = null
  } catch (err) {
    console.error(err)
    alert('Failed to update card')
  }
}

async function deleteCard(listId: string, cardId: string) {
  if (!confirm('Delete this card?')) return

  try {
    const res = await fetch(`${apiBase}/api/cards/${cardId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete card')
    const list = lists.value.find(l => l.id === listId)
    if (list) {
      list.cards = list.cards.filter((c: any) => c.id !== cardId)
    }
  } catch (err) {
    console.error(err)
    alert('Failed to delete card')
  }
}

// Drag and Drop for Cards
function onCardDragStart(e: DragEvent, card: any, listId: string) {
  // Stop the event bubbling so parent list drag events don't fire when dragging a card
  e.stopPropagation()
  draggedList.value = null
  draggedCard.value = { card, sourceListId: listId }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'card')
  }
}

function onCardDragOver(e: DragEvent, listId?: string) {
  // Ignore this event if a list is currently being dragged
  if (draggedList.value) return

  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  if (listId) {
    dragOverListId.value = listId
  }
}

async function onCardDrop(e: DragEvent, targetListId: string) {
  // Ignore this event if a list is currently being dragged
  if (draggedList.value) return

  e.preventDefault()
  e.stopPropagation()

  dragOverListId.value = null

  if (!draggedCard.value) return

  const { card, sourceListId } = draggedCard.value

  try {
    // Always perform the API update even if dropping in the same list
    const res = await fetch(`${apiBase}/api/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        title: card.title,
        description: card.description,
        dueDate: card.dueDate,
        priority: card.priority,
        isCompleted: card.isCompleted,
        listId: targetListId
      })
    })

    if (!res.ok) throw new Error('Failed to move card')

    // Do not move visually if the card stays in the same list
    if (sourceListId === targetListId) {
      draggedCard.value = null
      return
    }

    const sourceList = lists.value.find(l => l.id === sourceListId)
    const targetList = lists.value.find(l => l.id === targetListId)

    if (sourceList && targetList) {
      const cardIndex = sourceList.cards.findIndex((c: any) => c.id === card.id)
      if (cardIndex !== -1) {
        sourceList.cards.splice(cardIndex, 1)
        targetList.cards.push({ ...card, listId: targetListId })
      }
    }
  } catch (err) {
    console.error(err)
    alert('Failed to move card')
  } finally {
    draggedCard.value = null
  }
}

// Drag and Drop for Lists
function onListDragStart(e: DragEvent, list: any, index: number) {
  // Stop the event bubbling so board level drag events don't interfere when dragging a list
  e.stopPropagation()
  draggedCard.value = null
  draggedList.value = { list, index }
  draggingListIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'list')
  }
  // Use a clone of the entire list as the drag image rather than just the handle
  const listEl = (e.target as HTMLElement)?.closest('.list-item') as HTMLElement | null
  if (listEl && e.dataTransfer) {
    const clone = listEl.cloneNode(true) as HTMLElement
    clone.style.position = 'absolute'
    clone.style.top = '-9999px'
    clone.style.left = '-9999px'
    clone.style.width = `${listEl.offsetWidth}px`
   // clone.style.opacity = '0'
    document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, clone.offsetWidth / 2, 24)
    // Remove the clone immediately after the drag image has been captured
    setTimeout(() => document.body.removeChild(clone), 0)
  }
}

function onListDragEnd(e: DragEvent) {
  draggingListIndex.value = null
}

function onListDragOver(e: DragEvent) {
  // Ignore this event if a card is currently being dragged
  if (draggedCard.value) return

  e.preventDefault()
  // Stop propagation so only this drop zone handles the event
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

// When leaving a card drop zone, only clear the dragOverListId if the mouse truly leaves the zone
function onCardDragLeave(e: DragEvent) {
  const current = e.currentTarget as HTMLElement | null
  const related = (e as any).relatedTarget as HTMLElement | null
  // If there is no related target or the related target is not a child of the current target,
  // then the drag has left the entire drop zone and we should clear the highlight
  if (!current || !related || !current.contains(related)) {
    dragOverListId.value = null
  }
}

function onListDrop(e: DragEvent, targetIndex: number) {
  // Ignore this event if a card is currently being dragged
  if (draggedCard.value) return

  e.preventDefault()
  e.stopPropagation()

  if (!draggedList.value) return

  const { index: sourceIndex } = draggedList.value

  if (sourceIndex === targetIndex) {
    draggedList.value = null
    return
  }

  const newLists = [...lists.value]
  const [removed] = newLists.splice(sourceIndex, 1)
  newLists.splice(targetIndex, 0, removed)

  lists.value = newLists
  draggedList.value = null
}

function getPriorityColor(priority: number) {
  if (priority === 3) return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700'
  if (priority === 2) return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700'
  return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700'
}

function getPriorityLabel(priority: number) {
  if (priority === 3) return 'High'
  if (priority === 2) return 'Medium'
  return 'Low'
}

function formatDate(date: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dueDate: string) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

onMounted(loadBoard)
</script>

<template>
  <!-- Top‑level container for the board view page -->
  <div
    class="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
    <!-- Header section with board title, editing form and action buttons -->
    <header class="max-w-7xl mx-auto mb-6">
      <div
        class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 border border-gray-200 dark:border-slate-700">
        <!-- Row 1 : board title and actions -->
        <div class="flex flex-col lg:flex-row justify-between gap-4">
          <!-- Title and inline edit form -->
          <div class="flex-1 min-w-0">
            <div v-if="!editingBoard" class="flex items-center gap-3">
              <h1 class=" text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate break-all">
                {{ boardName }}
              </h1>
              <button id="edit-board-button" @click="editingBoard = true; editBoardName = boardName"
                class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition" title="Edit board name">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            <form v-else @submit.prevent="updateBoard" class="mt-1 flex gap-2">
              <input id="edit-board-name" v-model="editBoardName" type="text"
                class="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autofocus />
              <button id="save-edit-board-button" type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Save
              </button>
              <button id="cancel-edit-board-button" type="button" @click="editingBoard = false"
                class="px-4 py-2 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition">
                Cancel
              </button>
            </form>
          </div>

          <!-- Actions (right side) -->
          <div class="flex flex-wrap items-center gap-2 shrink-0 justify-end">
            <button id="delete-board-button" @click="deleteBoard"
              class="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition" title="Delete board">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button id="back-to-boards-button" @click="router.push('/boards')"
              class="px-4 py-2  text-white bg-blue-700 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg text-sm font-medium transition">
              ← Back
            </button>
          </div>
        </div>

        <!-- Row 2 : sorting controls (full width on mobile, inline on desktop) -->
        <div class="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Sort by
            </span>

            <!-- Segmented control -->
            <div class="flex items-center overflow-hidden rounded-lg bg-blue-600 dark:bg-blue-700 p-1">
              <button id="sort-priority-button" @click="sortBy = 'none'" :class="[
                'px-3 py-1.5 text-sm font-medium rounded-md transition',
                sortBy === 'none' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-900 dark:text-slate-200'
              ]" :aria-pressed="sortBy === 'none'">
                Default
              </button>
              <button id="sort-priority-button" @click="sortBy = 'priority'" :class="[
                'px-3 py-1.5 text-sm font-medium rounded-md transition',
                sortBy === 'priority' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-900 dark:text-slate-200'
              ]" :aria-pressed="sortBy === 'priority'">
                Priority
              </button>
              <button id="sort-due-date-button" @click="sortBy = 'dueDate'" :class="[
                'px-3 py-1.5 text-sm font-medium rounded-md transition',
                sortBy === 'dueDate' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-900 dark:text-slate-200'
              ]" :aria-pressed="sortBy === 'dueDate'">
                Due Date
              </button>
              <button id="Priority+Date-button" @click="sortBy = 'priorityAndDueDate'" :class="[
                'px-3 py-1.5 text-sm font-medium rounded-md transition',
                sortBy === 'priorityAndDueDate' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-900 dark:text-slate-200'
              ]">
                Priority + Date
              </button>
            </div>
          </div>

          <!-- Optional empty space for additional controls (e.g. search field or tags) -->
          <div class="hidden md:block text-xs text-slate-400 dark:text-slate-500">
            <!-- Placeholder if you want to add a search field or tags later -->
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto">
      <div v-if="loading" class="text-center text-slate-500 py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4">Loading board...</p>
      </div>

      <div class="mb-6">
        <!-- Form to add a new list to the current board -->
        <div
          class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-gray-200 dark:border-slate-700">
          <form @submit.prevent="createList" class="flex gap-2">
            <input id="new-list-name" v-model="newListName" type="text" placeholder="+ Add a new list..."
              class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
            <button id="add-list-button" type="submit"
              class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition transform hover:scale-105"
              :disabled="!newListName.trim()">
              Add List
            </button>
          </form>
        </div>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-6 px-1">
        <!-- Draggable lists container -->
        <div v-for="(list, index) in lists" :key="list.id" @dragover="onListDragOver" @drop="onListDrop($event, index)"
          class=" list-item bg-gray-50 dark:bg-slate-800 rounded-xl p-4 w-103 shrink-0 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow">
          <!-- List header with title, card count and list actions -->
          <div class="flex items-center justify-between mb-4">
            <div v-if="editingList?.id === list.id" class="flex-1 flex gap-2 min-w-0">
              <input id="edit-list-title" v-model="editingList.name" type="text" class="flex-1 min-w-0 px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:text-slate-100 
         focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                @keyup.enter="updateList(list.id, editingList.name)" autofocus />
              <button id="save-edit-list-button" @click="updateList(list.id, editingList.name)"
                class="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="Save changes">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button id="cancel-edit-list-button" @click="editingList = null"
                class="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-else class="flex items-center gap-2 flex-1 min-w-0">
              <button id="move-list-button" draggable="true" @dragstart="onListDragStart($event, list, index)"
                @dragend="onListDragEnd"
                class="p-1 text-gray-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing transition"
                title="Move list">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Vertical Axis -->
                  <path d="M12 3v18" />
                  <path d="M12 3l-3 3" />
                  <path d="M12 3l3 3" />
                  <path d="M12 21l-3-3" />
                  <path d="M12 21l3-3" />
                  <!-- Horizontal Axis -->
                  <path d="M3 12h18" />
                  <path d="M3 12l3-3" />
                  <path d="M3 12l3 3" />
                  <path d="M21 12l-3-3" />
                  <path d="M21 12l-3 3" />
                </svg>
              </button>
              <h2 class="font-semibold text-lg text-slate-900 dark:text-slate-100 flex-1 truncate">
                {{ list.name }}
              </h2>
              <span
                class="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                {{ list.cards.length }}
              </span>
              <button id="edit-list-button" @click="editingList = { id: list.id, name: list.name }"
                class="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button id="delete-list-button" @click="deleteList(list.id)"
                class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Form to add a new card to this list -->
          <form @submit.prevent="createCard(list.id, list._newTitle, list._newDesc, list._newDue, list._newPriority)"
            class="space-y-2 mb-4 p-3 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 shadow-sm">
            <input id="new-card-title" v-model="list._newTitle" placeholder="Card title"
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            <textarea id="new-card-description" v-model="list._newDesc" placeholder="Description (optional)" rows="2"
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"></textarea>
            <div class="flex gap-2 items-stretch">
              <input id="new-card-due-date" v-model="list._newDue" type="date"
                class="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select id="new-card-priority" v-model.number="list._newPriority"
                class="text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option :value="1">🟢 Low</option>
                <option :value="2">🟡 Medium</option>
                <option :value="3">🔴 High</option>
              </select>
              <button id="add-card-button" type="submit"
                class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition transform hover:scale-105">
                + Add
              </button>
            </div>
          </form>

          <!-- Cards container supporting drag‑and‑drop for cards -->
          <div class="space-y-2 min-h-[100px]" :class="{ 'drag-over': dragOverListId === list.id }"
            @dragover.prevent="onCardDragOver($event, list.id)" @drop.stop.prevent="onCardDrop($event, list.id)"
            @dragleave="onCardDragLeave($event)">
            <div v-for="card in getSortedCards(list.cards)" :key="card.id" :draggable="true"
              @dragstart="onCardDragStart($event, card, list.id)" class="group relative">
              <!-- Card edit form -->
              <div v-if="editingCard?.id === card.id"
                class="p-3 rounded-lg bg-white dark:bg-slate-700 border-2 border-blue-500 shadow-lg">
                <input id="edit-card-title" v-model="editingCard.title" type="text"
                  class="w-full px-2 py-1 mb-2 text-sm border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea id="edit-card-description" v-model="editingCard.description" rows="2"
                  class="w-full px-2 py-1 mb-2 text-sm border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                <div class="flex gap-2 mb-2">
                  <input id="edit-card-due-date" v-model="editingCard.dueDate" type="date"
                    class="flex-1 text-xs px-2 py-1 border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none" />
                  <select id="edit-card-priority" v-model.number="editingCard.priority"
                    class="text-xs px-2 py-1 border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none">
                    <option :value="1">Low</option>
                    <option :value="2">Medium</option>
                    <option :value="3">High</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button id="save-card-button" @click="updateCard(card.id, editingCard)"
                    class="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition">
                    Save
                  </button>
                  <button @click="editingCard = null"
                    class="flex-1 px-3 py-1.5 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 text-sm transition">
                    Cancel
                  </button>
                </div>
              </div>

              <!-- Display of a single card with title, description, priority and due date -->
              <div v-else :class="getPriorityColor(card.priority || 1)"
                class="p-3 rounded-lg border-2 shadow-md hover:shadow-xl cursor-move transition-all transform hover:-translate-y-1">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1">{{ card.title }}</p>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button id="edit-card=bton" @click="editingCard = { ...card }"
                      class="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-blue-600"
                      title="Edit card">
                      <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                    </button>
                    <button id="delete-card-button" @click="deleteCard(list.id, card.id)"
                      class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p v-if="card.description" class="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                  {{ card.description }}
                </p>

                <div class="flex items-center justify-between gap-2 mt-2">
                  <span class="text-xs font-semibold px-2 py-1 rounded-full" :class="{
                    'bg-red-500 text-white': card.priority === 3,
                    'bg-yellow-500 text-white': card.priority === 2,
                    'bg-green-500 text-white': card.priority === 1
                  }">
                    {{ getPriorityLabel(card.priority || 1) }}
                  </span>

                  <span v-if="card.dueDate" class="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    :class="isOverdue(card.dueDate) ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatDate(card.dueDate) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="list.cards.length === 0" class="text-center py-8 text-slate-400 text-sm">
              No cards yet
            </div>
          </div>
        </div>

        <div class="w-80 shrink-0"></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}

/* Visual improvements for drag & drop */
[draggable="true"] {
  cursor: move;
}

[draggable="true"]:active {
  opacity: 0.5;
}

.drag-over {
  background-color: rgba(99, 102, 241, 0.1);
  border: 2px dashed #6366f1;
}

.list-item {
  transition: transform 150ms ease, opacity 120ms ease, box-shadow 150ms ease, ring 150ms ease;
}
</style>