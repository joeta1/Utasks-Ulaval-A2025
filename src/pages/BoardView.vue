<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
    lists.value = (listPayload?.data ?? []).map(l => ({ ...l, cards: [] }))

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

async function createList() {
  const name = newListName.value.trim()
  if (!name) return
  
  try {
    const res = await fetch(`${apiBase}/api/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, boardId })
    })
    if (!res.ok) throw new Error('Failed to create list')
    const payload = await res.json()
    if (!payload?.success) throw new Error(payload?.error || 'Failed to create list')
    lists.value.push({ ...payload.data, cards: [] })
    newListName.value = ''
  } catch (err) {
    console.error(err)
  }
}

async function createCard(listId: string, title: string, description = '', dueDate?: string, priority = 1) {
  if (!title.trim()) return
  
  try {
    const res = await fetch(`${apiBase}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    if (list) list.cards.push(payload.data)
  } catch (err) {
    console.error(err)
  }
}

onMounted(loadBoard)
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-slate-900 p-6">
    <header class="flex justify-between items-center mb-6 max-w-6xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ boardName }}</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm">Your lists and cards</p>
      </div>
      <button
        @click="router.push('/boards')"
        class="px-3 py-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm transition"
      >
        Back
      </button>
    </header>

    <main class="max-w-6xl mx-auto">
      <div v-if="loading" class="text-center text-slate-500">Loading...</div>

      <div class="mb-6 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
        <form @submit.prevent="createList" class="flex gap-2">
          <input
            v-model="newListName"
            type="text"
            placeholder="New list name"
            class="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            :disabled="!newListName.trim()"
          >
            Add
          </button>
        </form>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-4">
        <div
          v-for="list in lists"
          :key="list.id"
          class="bg-gray-200 dark:bg-slate-800 rounded-xl p-4 w-64 flex-shrink-0 shadow-md"
        >
          <h2 class="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-3">
            {{ list.name }}
          </h2>

          <form 
            @submit.prevent="createCard(list.id, list._newTitle, list._newDesc, list._newDue, list._newPriority)"
            class="space-y-2 mb-3 p-2 rounded-md bg-gray-50 dark:bg-slate-700/50"
          >
            <input 
              v-model="list._newTitle" 
              placeholder="Card title"
              class="w-full text-sm px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <textarea 
              v-model="list._newDesc" 
              placeholder="Description"
              class="w-full text-sm px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            ></textarea>
            <div class="flex gap-2 items-center">
              <input 
                v-model="list._newDue" 
                type="date"
                class="flex-1 text-sm px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none"
              />
              <select 
                v-model.number="list._newPriority"
                class="text-sm px-2 py-1 border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none"
              >
                <option :value="1">Low</option>
                <option :value="2">Medium</option>
                <option :value="3">High</option>
              </select>
              <button 
                type="submit"
                class="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm transition"
              >
                +
              </button>
            </div>
          </form>

          <div class="space-y-2">
            <div
              v-for="card in list.cards"
              :key="card.id"
              class="p-3 rounded-lg bg-white dark:bg-slate-700 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-600 cursor-pointer transition"
            >
              <p class="text-sm text-slate-800 dark:text-slate-100">{{ card.title }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>