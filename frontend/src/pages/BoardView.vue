<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import authStore from '../stores/auth'
import { useRoute, useRouter } from 'vue-router'
import BoardHeader from '../components/BoardHeader.vue'
import NewListForm from '../components/NewListForm.vue'
import CardItem from '../components/CardItem.vue'
import ListColumn from '../components/ListColumn.vue'

// API base and routing
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

// Board ID from route
const boardId = route.params.id as string
// Auth check
const userId = computed(() => authStore.currentUser.value?.id)
if (!userId.value) router.push('/')
watch(userId, (val) => {
  if (!val) router.push('/')
})

// State
const boardName = ref('')
const lists = ref<any[]>([])
const newListName = ref('')
const loading = ref(false)
const editingBoard = ref(false)
const editBoardName = ref('')

// Drag state
const draggedCard = ref<any>(null)
const draggedList = ref<any>(null)
const draggingListIndex = ref<number | null>(null)

// Edit state
const editingCard = ref<any>(null)
const editingList = ref<any>(null)

// UI state
const sortBy = ref<'priority' | 'dueDate' | 'priorityAndDueDate' | 'none'>('none')
const dragOverListId = ref<string | null>(null)

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

// Sorting helper

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
      // Priority first
      const priorityDiff = (b.priority || 1) - (a.priority || 1)
      if (priorityDiff !== 0) return priorityDiff
      // Then date
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return 0
  })
}

// Board operations

async function updateBoard() {
  const name = editBoardName.value.trim()
  if (!name) return

  try {
    const res = await fetch(`${apiBase}/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

// Card operations

async function createCard(listId: string, title: string, description = '', dueDate?: string, priority = 2) {
  if (!title.trim()) return

  try {
    const res = await fetch(`${apiBase}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

// Desktop drag & drop
function onCardDragStart(e: DragEvent, card: any, listId: string) {
  e.stopPropagation()
  draggedList.value = null
  draggedCard.value = { card, sourceListId: listId }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'card')
  }
}

function onCardDragOver(e: DragEvent, listId?: string) {
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
  if (draggedList.value) return

  e.preventDefault()
  e.stopPropagation()

  dragOverListId.value = null

  if (!draggedCard.value) return

  const { card, sourceListId } = draggedCard.value

  try {
    const res = await fetch(`${apiBase}/api/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

    // Skip visual update if same list
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

// List drag handlers
function onListDragStart(e: DragEvent, list: any, index: number) {
  e.stopPropagation()
  draggedCard.value = null
  draggedList.value = { list, index }
  draggingListIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('type', 'list')
  }
  // Clone list for drag image
  const listEl = (e.target as HTMLElement)?.closest('.list-item') as HTMLElement | null
  if (listEl && e.dataTransfer) {
    const clone = listEl.cloneNode(true) as HTMLElement
    clone.style.position = 'absolute'
    clone.style.top = '-9999px'
    clone.style.left = '-9999px'
    clone.style.width = `${listEl.offsetWidth}px`
    document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, clone.offsetWidth / 2, 24)
    setTimeout(() => document.body.removeChild(clone), 0)
  }
}

function onListDragEnd(e: DragEvent) {
  draggingListIndex.value = null
}

function onListDragOver(e: DragEvent) {
  if (draggedCard.value) return

  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function onCardDragLeave(e: DragEvent) {
  const current = e.currentTarget as HTMLElement | null
  const related = (e as any).relatedTarget as HTMLElement | null
  if (!current || !related || !current.contains(related)) {
    dragOverListId.value = null
  }
}

function onListDrop(e: DragEvent, targetIndex: number) {
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

// Touch drag state
const touchDrag = ref<any>({ card: null, sourceListId: null, touchId: null, clientX: 0, clientY: 0, active: false })
const touchListDrag = ref<any>({ list: null, sourceIndex: null, touchId: null, clientX: 0, clientY: 0, targetIndex: null, active: false })
const touchListPressTimer = ref<number | null>(null)
const touchListStartPos = ref<{ x: number; y: number } | null>(null)
const touchCardPressTimer = ref<number | null>(null)
const touchCardStartPos = ref<{ x: number; y: number } | null>(null)
const LONG_PRESS_DELAY = 200

function onCardTouchStart(e: TouchEvent, card: any, listId: string) {
  e.stopPropagation()
  const t = (e as TouchEvent).changedTouches[0]
  touchCardStartPos.value = { x: t.clientX, y: t.clientY }

  // Long-press timer
  if (touchCardPressTimer.value) {
    clearTimeout(touchCardPressTimer.value)
    touchCardPressTimer.value = null
  }
  touchCardPressTimer.value = window.setTimeout(() => {
    touchDrag.value = { card, sourceListId: listId, touchId: t.identifier, clientX: t.clientX, clientY: t.clientY, active: true }
    touchCardPressTimer.value = null
  }, LONG_PRESS_DELAY)
}

function onCardTouchMove(e: TouchEvent) {
  const t = (e as TouchEvent).changedTouches[0]

  // Cancel long-press if user moves
  if (!touchDrag.value.active) {
    const start = touchCardStartPos.value
    if (start) {
      const dx = Math.abs(t.clientX - start.x)
      const dy = Math.abs(t.clientY - start.y)
      if (dx > 10 || dy > 10) {
        if (touchCardPressTimer.value) {
          clearTimeout(touchCardPressTimer.value)
          touchCardPressTimer.value = null
        }
        touchCardStartPos.value = null
      }
    }
    return
  }

  // Update preview position
  touchDrag.value.clientX = t.clientX
  touchDrag.value.clientY = t.clientY
  const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
  const listEl = el?.closest('[data-list-id]') as HTMLElement | null
  dragOverListId.value = listEl?.getAttribute('data-list-id') ?? null
  e.preventDefault()
}

async function onCardTouchEnd(e: TouchEvent) {
  // Clear timer if tap
  if (touchCardPressTimer.value) {
    clearTimeout(touchCardPressTimer.value)
    touchCardPressTimer.value = null
    touchCardStartPos.value = null
    return
  }

  if (!touchDrag.value.active) return
  const { card, sourceListId } = touchDrag.value
  const targetListId = dragOverListId.value ?? sourceListId

  // reset drag state
  touchDrag.value = { card: null, sourceListId: null, touchId: null, clientX: 0, clientY: 0, active: false }
  dragOverListId.value = null

  if (!card || !targetListId) return
  if (targetListId === sourceListId) return

  try {
    const res = await fetch(`${apiBase}/api/cards/${card.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

    const sourceList = lists.value.find((l: any) => l.id === sourceListId)
    const targetList = lists.value.find((l: any) => l.id === targetListId)

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
  }
}

function onCardTouchCancel(_e: TouchEvent) {
  if (touchCardPressTimer.value) {
    clearTimeout(touchCardPressTimer.value)
    touchCardPressTimer.value = null
  }
  touchCardStartPos.value = null
  touchDrag.value = { card: null, sourceListId: null, touchId: null, active: false }
  dragOverListId.value = null
}

// List touch handlers
function onListTouchStart(e: TouchEvent, list: any, index: number) {
  e.stopPropagation()
  const t = (e as TouchEvent).changedTouches[0]
  touchListStartPos.value = { x: t.clientX, y: t.clientY }

  if (touchListPressTimer.value) {
    clearTimeout(touchListPressTimer.value)
    touchListPressTimer.value = null
  }
  touchListPressTimer.value = window.setTimeout(() => {
    touchListDrag.value = { list, sourceIndex: index, touchId: t.identifier, clientX: t.clientX, clientY: t.clientY, targetIndex: index, active: true }
    touchListPressTimer.value = null
  }, LONG_PRESS_DELAY)
}

function onListTouchMove(e: TouchEvent) {
  const t = (e as TouchEvent).changedTouches[0]
  // Cancel on movement if not active
  if (!touchListDrag.value.active) {
    const start = touchListStartPos.value
    if (start) {
      const dx = Math.abs(t.clientX - start.x)
      const dy = Math.abs(t.clientY - start.y)
      if (dx > 10 || dy > 10) {
        if (touchListPressTimer.value) {
          clearTimeout(touchListPressTimer.value)
          touchListPressTimer.value = null
        }
        touchListStartPos.value = null
      }
    }
    return
  }

  // Update position and target
  touchListDrag.value.clientX = t.clientX
  touchListDrag.value.clientY = t.clientY
  const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
  const listEl = el?.closest('[data-list-index]') as HTMLElement | null
  const idx = listEl ? Number(listEl.getAttribute('data-list-index')) : null
  touchListDrag.value.targetIndex = (idx === null || isNaN(idx)) ? touchListDrag.value.targetIndex : idx

  e.preventDefault()
}

function onListTouchEnd(e: TouchEvent) {
  // Clear timer if tap
  if (touchListPressTimer.value) {
    clearTimeout(touchListPressTimer.value)
    touchListPressTimer.value = null
    touchListStartPos.value = null
    return
  }

  if (!touchListDrag.value.active) return
  const { sourceIndex, targetIndex } = touchListDrag.value

  // Reset state
  touchListDrag.value = { list: null, sourceIndex: null, touchId: null, clientX: 0, clientY: 0, targetIndex: null, active: false }
  touchListStartPos.value = null

  if (sourceIndex == null || targetIndex == null) return
  if (sourceIndex === targetIndex) return

  const newLists = [...lists.value]
  const [removed] = newLists.splice(sourceIndex, 1)
  newLists.splice(targetIndex, 0, removed)
  lists.value = newLists
}

function onListTouchCancel(_e: TouchEvent) {
  if (touchListPressTimer.value) {
    clearTimeout(touchListPressTimer.value)
    touchListPressTimer.value = null
  }
  touchListStartPos.value = null
  touchListDrag.value = { list: null, sourceIndex: null, touchId: null, clientX: 0, clientY: 0, targetIndex: null, active: false }
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

// Component wrappers
function startEditBoard() {
  editingBoard.value = true
  editBoardName.value = boardName.value
}

function cancelEditBoard() {
  editingBoard.value = false
}

function saveBoardName(name: string) {
  editBoardName.value = name
  updateBoard()
}

function setSortBy(val: any) {
  sortBy.value = val
}

function handleCreateList(name: string) {
  newListName.value = name
  createList()
}

function startEditCard(card: any) {
  editingCard.value = { ...card }
}

function cancelEditCard() {
  editingCard.value = null
}

function startEditList(list: any) {
  editingList.value = { id: list.id, name: list.name }
}

function cancelEditList() {
  editingList.value = null
}
</script>

<template>
  <!-- Top‑level container for the board view page -->
  <div
    class="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
    <!-- Back button: placed above the board name (responsive) -->
    <!-- SECTION: Back button — find by id="#back-to-boards-button" (top-left, small screens show icon only) -->
    <div class="max-w-7xl mx-auto mb-4">
      <button id="back-to-boards-button" @click="router.push('/boards')"
        class="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg font-medium shadow-md transition"
        aria-label="Back to boards">
        <span class="hidden sm:inline">← Back to Boards</span>
        <span class="sm:hidden">←</span>
      </button>
    </div>
    <!-- Header section extracted into a component -->
    <BoardHeader :boardName="boardName" :editingBoard="editingBoard" :currentEditName="editBoardName" :sortBy="sortBy"
      :onStartEdit="startEditBoard" :onSave="saveBoardName" :onCancel="cancelEditBoard" :onDelete="deleteBoard"
      :onSetSortBy="setSortBy" />

    <main class="max-w-7xl mx-auto">
      <div v-if="loading" class="text-center text-slate-500 py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4">Loading board...</p>
      </div>

      <div class="mb-6">
        <!-- New list form extracted into a component -->
        <NewListForm :onCreate="handleCreateList" />
      </div>

      <div class="flex flex-wrap gap-4 pb-6 px-1">
        <!-- Draggable lists container (now wrapping) -->
        <!-- SECTION: Lists container — lists will wrap to the next row when horizontal space runs out; each list element has data-list-id and data-list-index -->
        <ListColumn v-for="(list, index) in lists" :key="list.id" :list="list" :index="index" :editingList="editingList"
          :editingCard="editingCard" :touchListDrag="touchListDrag" :onListDragStart="onListDragStart"
          :onListDragEnd="onListDragEnd" :onListDragOver="onListDragOver" :onListDrop="onListDrop"
          :onListTouchStart="onListTouchStart" :onListTouchMove="onListTouchMove" :onListTouchEnd="onListTouchEnd"
          :onListTouchCancel="onListTouchCancel" :onCardDragOver="onCardDragOver" :onCardDrop="onCardDrop"
          :onCardDragLeave="onCardDragLeave" :createCard="createCard" :updateList="updateList" :deleteList="deleteList"
          :startEditCard="startEditCard" :cancelEditCard="cancelEditCard" :updateCard="updateCard"
          :deleteCard="deleteCard" :onCardDragStart="onCardDragStart" :onCardTouchStart="onCardTouchStart"
          :onCardTouchMove="onCardTouchMove" :onCardTouchEnd="onCardTouchEnd" :onCardTouchCancel="onCardTouchCancel"
          :onStartEditList="startEditList" :onCancelEditList="cancelEditList" :getSortedCards="getSortedCards"
          :getPriorityColor="getPriorityColor" :getPriorityLabel="getPriorityLabel" :formatDate="formatDate"
          :isOverdue="isOverdue" />

        <!-- spacer removed: lists now wrap; no horizontal spacer needed -->
      </div>
    </main>
  </div>
  <!-- Floating preview for touch-based drag (follows the finger) -->
  <div v-if="touchDrag.active && touchDrag.card" class="pointer-events-none fixed z-50"
    :style="{ left: touchDrag.clientX + 'px', top: touchDrag.clientY + 'px', transform: 'translate(-50%, -50%)' }">
    <div
      class="w-72 sm:w-80 md:w-96 p-3 rounded-lg border-2 shadow-2xl bg-white dark:bg-slate-700 opacity-95 transform transition-transform duration-75">
      <div class="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{{ touchDrag.card.title }}</div>
      <p v-if="touchDrag.card.description" class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{{
        touchDrag.card.description }}</p>
      <div class="flex items-center justify-between mt-2">
        <span class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap shrink-0" :class="{
          'bg-red-500 text-white': touchDrag.card.priority === 3,
          'bg-yellow-500 text-white': touchDrag.card.priority === 2,
          'bg-green-500 text-white': touchDrag.card.priority === 1
        }">{{ getPriorityLabel(touchDrag.card.priority || 1) }}</span>
        <span v-if="touchDrag.card.dueDate"
          class="text-xs px-2 py-1 rounded-full text-slate-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300">{{
            formatDate(touchDrag.card.dueDate) }}</span>
      </div>
    </div>
  </div>
  <!-- Floating preview for list touch-drag -->
  <div v-if="touchListDrag.active && touchListDrag.list" class="pointer-events-none fixed z-40"
    :style="{ left: touchListDrag.clientX + 'px', top: touchListDrag.clientY + 'px', transform: 'translate(-50%, -50%)' }">
    <div
      class="w-56 p-3 rounded-lg border shadow-2xl bg-white dark:bg-slate-800 opacity-95 transform transition-transform duration-75">
      <div class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{{ touchListDrag.list.name }}</div>
      <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ touchListDrag.list.cards?.length ?? 0 }} cards
      </div>
    </div>
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

.drag-over-list {
  transform: translateY(-6px);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.15);
  border: 2px dashed rgba(99, 102, 241, 0.7);
  background-color: rgba(99, 102, 241, 0.06);
}

.list-item {
  transition: transform 150ms ease, opacity 120ms ease, box-shadow 150ms ease, ring 150ms ease;
}
</style>