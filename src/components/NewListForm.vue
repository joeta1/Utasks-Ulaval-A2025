<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ onCreate: Function }>()
const name = ref('')

function submit(e: Event) {
  e.preventDefault()
  const v = name.value.trim()
  if (!v) return
  props.onCreate(v)
  name.value = ''
}
</script>

<template>
  <div
    class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-gray-200 dark:border-slate-700">
    <form @submit.prevent="submit" class="flex flex-col sm:flex-row gap-2">
      <label for="new-list-name" class="sr-only">List name</label>
      <input id="new-list-name" v-model="name" type="text" placeholder="+ Add a new list..."
        class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
      <button id="add-list-button" type="submit"
        class="px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg transition transform hover:scale-105">
        Add List
      </button>
    </form>
  </div>
</template>

<style scoped>
/* small local styles if needed */
</style>
