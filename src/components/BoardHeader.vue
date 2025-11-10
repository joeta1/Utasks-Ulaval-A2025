<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  boardName: string
  editingBoard: boolean
  currentEditName: string
  sortBy: 'priority' | 'dueDate' | 'priorityAndDueDate' | 'none'
  onStartEdit: Function
  onSave: Function
  onCancel: Function
  onDelete: Function
  onSetSortBy: Function
}>()

const localName = ref(props.currentEditName ?? '')

watch(() => props.currentEditName, (v) => (localName.value = v ?? ''))
watch(() => props.editingBoard, (v) => {
  if (v && !localName.value) localName.value = props.boardName
})

function save() {
  props.onSave(localName.value)
}
</script>

<template>
  <div class="max-w-7xl mx-auto mb-6">
    <div
      class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 pt-12 md:pt-6 border border-gray-200 dark:border-slate-700 relative">
      <div class="flex flex-col lg:flex-row justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div v-if="!props.editingBoard" class="flex flex-wrap items-center gap-2 md:gap-3">
            <h1 class=" text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate break-all">
              {{ props.boardName }}
            </h1>

            <div class="flex items-center gap-2 mt-2 md:mt-0">
              <button id="edit-board-button" @click="props.onStartEdit()"
                class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition" title="Edit board name">
                <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button id="delete-board-button" @click="props.onDelete()"
                class="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition" title="Delete board">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <form v-else @submit.prevent="save"
            class="mt-2 sm:mt-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
            <input id="edit-board-name" v-model="localName" type="text"
              class="w-full sm:flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autofocus />
            <button id="save-edit-board-button" type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              Save
            </button>
            <button id="cancel-edit-board-button" type="button" @click="props.onCancel()"
              class="px-4 py-2 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition">
              Cancel
            </button>

            <button id="delete-board-button-edit" @click.prevent="props.onDelete()"
              class="p-2 ml-0 sm:ml-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition mt-2 sm:mt-0"
              title="Delete board">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </form>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-center"></div>
      </div>

      <div class="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Sort by
          </span>

          <div class="flex items-center overflow-hidden rounded-lg bg-blue-500 dark:bg-blue-600 p-1">
            <button @click.prevent="props.onSetSortBy('none')" :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition',
              props.sortBy === 'none' ? 'bg-white dark:bg-slate-600 shadow' : 'text-white dark:text-slate-100'
            ]" :aria-pressed="props.sortBy === 'none'">Default</button>
            <button @click.prevent="props.onSetSortBy('priority')" :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition',
              props.sortBy === 'priority' ? 'bg-white dark:bg-slate-600 shadow' : 'text-white dark:text-slate-100'
            ]" :aria-pressed="props.sortBy === 'priority'">Priority</button>
            <button @click.prevent="props.onSetSortBy('dueDate')" :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition',
              props.sortBy === 'dueDate' ? 'bg-white dark:bg-slate-600 shadow' : 'text-white dark:text-slate-100'
            ]" :aria-pressed="props.sortBy === 'dueDate'">Due Date</button>
            <button @click.prevent="props.onSetSortBy('priorityAndDueDate')" :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition',
              props.sortBy === 'priorityAndDueDate' ? 'bg-white dark:bg-slate-600 shadow' : 'text-white dark:text-slate-100'
            ]">Priority + Date</button>
          </div>
        </div>

        <div class="hidden md:block text-xs text-slate-400 dark:text-slate-500"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keep styling minimal; styles are mostly in parent */
</style>
