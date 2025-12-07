<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  board: { id: string; name: string }
}>()

const emit = defineEmits(['open', 'update', 'delete'])

const editing = ref(false)
const editName = ref('')

function startEdit() {
  editing.value = true
  editName.value = props.board.name
}

function saveEdit() {
  const name = editName.value.trim()
  if (!name) return
  emit('update', props.board.id, name)
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function openBoard() {
  emit('open', props.board.id)
}

function deleteBoard() {
  emit('delete', props.board.id, props.board.name)
}
</script>

<template>
  <div
    class="group relative bg-linear-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-gray-200 dark:border-slate-600 overflow-hidden">
    <div v-if="editing" class="p-5">
      <label for="edit-board-name" class="sr-only">Board name</label>
      <input id="edit-board-name" v-model="editName" type="text"
        class="w-full px-3 py-2 mb-3 border border-blue-500 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keyup.enter="saveEdit" autofocus placeholder="Board name" aria-label="Board name" />
      <div class="flex flex-col sm:flex-row gap-2">
        <button @click="saveEdit"
          class="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Save</button>
        <button @click="cancelEdit"
          class="flex-1 px-3 py-2 bg-gray-300 dark:bg-slate-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500 transition">Cancel</button>
      </div>
    </div>

    <div v-else>
      <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
      <div class="p-5">
        <div class="flex items-start justify-between mb-3">
          <div @click="openBoard" class="flex-1 cursor-pointer">
            <h3
              class="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition flex items-center gap-2">
              {{ board.name }}</h3>
          </div>
          <div class="flex gap-1">
            <button @click="startEdit"
              class="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition"
              title="Edit board">Rename</button>
            <button @click="deleteBoard"
              class="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 transition"
              title="Delete board">Delete</button>
          </div>
        </div>
      </div>
      <div
        class="bg-linear-to-r from-blue-50 to-blue-50 dark:from-slate-700/50 dark:to-slate-600/50 px-5 py-3 border-t border-gray-200 dark:border-slate-600">
        <button @click="openBoard"
          class="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center justify-center gap-2">Click
          here to Open Board</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group:hover h3 {
  text-decoration: none;
}
</style>
