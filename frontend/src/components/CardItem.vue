<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  card: any
  listId: string
  editingCard: any | null
  // handlers passed from parent
  onEdit: Function
  onSave: Function
  onCancelEdit: Function
  onDelete: Function
  onCardDragStart: Function
  onCardTouchStart: Function
  onCardTouchMove: Function
  onCardTouchEnd: Function
  onCardTouchCancel: Function
  // helpers
  getPriorityColor: Function
  getPriorityLabel: Function
  formatDate: Function
  isOverdue: Function
}>()

// Local copy used while editing
const localEdit = ref<any>(null)

watch(() => props.editingCard, (v) => {
  if (v && v.id === props.card.id) {
    // clone so we can edit locally
    localEdit.value = { ...v }
  } else {
    localEdit.value = null
  }
}, { immediate: true })

function save() {
  if (!localEdit.value) return
  // call parent save handler with card id and updated fields
  props.onSave(props.card.id, localEdit.value)
}

function startEdit() {
  props.onEdit(props.card)
}

function cancel() {
  props.onCancelEdit()
}

function remove() {
  props.onDelete(props.listId, props.card.id)
}

// typed wrappers for DOM event handlers so TS knows the signatures
function handleDragStart(e: DragEvent) {
  props.onCardDragStart(e, props.card, props.listId)
}

function handleTouchStart(e: TouchEvent) {
  props.onCardTouchStart(e, props.card, props.listId)
}

function handleTouchMove(e: TouchEvent) {
  props.onCardTouchMove(e)
}

function handleTouchEnd(e: TouchEvent) {
  props.onCardTouchEnd(e)
}

function handleTouchCancel(e: TouchEvent) {
  props.onCardTouchCancel(e)
}
</script>

<template>
  <div>
    <div v-if="editingCard?.id === card.id"
      class="p-3 rounded-lg bg-white dark:bg-slate-700 border-2 border-blue-500 shadow-lg">
      <div class="mb-2">
        <label for="edit-card-title" class="sr-only">Card title</label>
        <input id="edit-card-title" v-model="localEdit.title" type="text"
          class="w-full px-2 py-1 text-sm border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Card title" aria-label="Card title" />
      </div>
      <div class="mb-2">
        <label for="edit-card-description" class="sr-only">Card description</label>
        <textarea id="edit-card-description" v-model="localEdit.description" rows="2"
          class="w-full px-2 py-1 text-sm border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Description" aria-label="Card description"></textarea>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 mb-2">
        <div class="flex-1">
          <label for="edit-card-due-date" class="sr-only">Due date</label>
          <input id="edit-card-due-date" v-model="localEdit.dueDate" type="date"
            class="w-full sm:w-24 sm:flex-1 min-w-0 text-xs text-slate-800 dark:text-slate-100 px-2 py-1 border rounded dark:bg-slate-600 focus:outline-none"
            aria-label="Due date" />
        </div>
        <div class="flex-1">
          <label for="edit-card-priority" class="sr-only">Priority</label>
          <select id="edit-card-priority" v-model.number="localEdit.priority"
            class="w-full sm:w-28 text-xs px-2 py-1 border rounded dark:bg-slate-600 dark:text-slate-100 focus:outline-none"
            aria-label="Priority">
            <option :value="1">Low</option>
            <option :value="2">Medium</option>
            <option :value="3">High</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button id="save-card-button" @click="save"
          class="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition">Save</button>
        <button @click="cancel"
          class="flex-1 px-3 py-1.5 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 text-sm transition">Cancel</button>
      </div>
    </div>

    <div v-else :class="getPriorityColor(card.priority || 1)"
      class="p-3 rounded-lg border-2 shadow-md hover:shadow-xl cursor-move transition-all transform hover:-translate-y-1 overflow-hidden"
      :draggable="true" @dragstart="handleDragStart" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
      @touchend="handleTouchEnd" @touchcancel="handleTouchCancel">
      <div class="flex items-start justify-between gap-2 mb-2">
        <p class="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 min-w-0">{{ card.title }}</p>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button :id="'edit-card-button-' + card.id" @click="startEdit"
            class="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-600" title="Edit card"
            aria-label="Edit card">
            <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button :id="'delete-card-button-' + card.id" @click="remove"
            class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600" title="Delete card"
            aria-label="Delete card">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="card.description" class="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{{
        card.description }}</p>

      <div class="flex items-center justify-between gap-2 mt-2">
        <span class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap shrink-0" :class="{
          'bg-red-500 text-white': card.priority === 3,
          'bg-yellow-500 text-white': card.priority === 2,
          'bg-green-500 text-white': card.priority === 1
        }">{{ getPriorityLabel(card.priority || 1) }}</span>

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
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -moz-box-orient: vertical;
  box-orient: vertical;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  overflow: hidden;
}
</style>
