<script setup lang="ts">
import CardItem from './CardItem.vue'

const {
    list,
    index,
    editingList,
    editingCard,
    touchListDrag,
    onStartEditList,
    onCancelEditList,
    // handlers
    onListDragStart,
    onListDragEnd,
    onListDragOver,
    onListDrop,
    onListTouchStart,
    onListTouchMove,
    onListTouchEnd,
    onListTouchCancel,
    onCardDragOver,
    onCardDrop,
    onCardDragLeave,
    createCard,
    updateList,
    deleteList,
    startEditCard,
    cancelEditCard,
    updateCard,
    deleteCard,
    onCardDragStart,
    onCardTouchStart,
    onCardTouchMove,
    onCardTouchEnd,
    onCardTouchCancel,
    getSortedCards,
    getPriorityColor,
    getPriorityLabel,
    formatDate,
    isOverdue,
} = defineProps<{
    list: any
    index: number
    editingList: any | null
    editingCard: any | null
    touchListDrag: any
    onStartEditList?: Function
    onCancelEditList?: Function
    // handlers
    onListDragStart: Function
    onListDragEnd: Function
    onListDragOver: Function
    onListDrop: Function
    onListTouchStart: Function
    onListTouchMove: Function
    onListTouchEnd: Function
    onListTouchCancel: Function
    onCardDragOver: Function
    onCardDrop: Function
    onCardDragLeave: Function
    createCard: Function
    updateList: Function
    deleteList: Function
    startEditCard: Function
    cancelEditCard: Function
    updateCard: Function
    deleteCard: Function
    onCardDragStart: Function
    onCardTouchStart: Function
    onCardTouchMove: Function
    onCardTouchEnd: Function
    onCardTouchCancel: Function
    getSortedCards: Function
    getPriorityColor: Function
    getPriorityLabel: Function
    formatDate: Function
    isOverdue: Function
}>()
// typed wrappers for drag events so TS accepts them
function handleDragStart(e: DragEvent) {
    onListDragStart && onListDragStart(e, list, index)
}

function handleDragEnd(e: DragEvent) {
    onListDragEnd && onListDragEnd(e)
}

import { ref, watch } from 'vue'

// local edit name to avoid mutating prop directly
const localEditName = ref('')

watch(() => editingList, (v) => {
    if (v && v.id === list.id) {
        localEditName.value = v.name ?? ''
    }
})

function saveEditList() {
    const name = localEditName.value.trim()
    if (!name) return
    updateList && updateList(list.id, name)
    onCancelEditList && onCancelEditList()
}

function cancelEditList() {
    onCancelEditList && onCancelEditList()
}
</script>

<template>
    <div :data-list-id="list.id" :data-list-index="index" @dragover="onListDragOver($event)"
        @drop.stop.prevent="onListDrop($event, index)" @touchstart="onListTouchStart($event, list, index)"
        @touchmove="onListTouchMove($event)" @touchend="onListTouchEnd($event)" @touchcancel="onListTouchCancel($event)"
        :class="['list-item bg-gray-50 dark:bg-slate-800 rounded-xl p-4 w-full sm:w-72 md:w-80 lg:w-96 shrink-0 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-shadow', { 'drag-over-list': touchListDrag.active && touchListDrag.targetIndex === index }]">

        <!-- List header -->
        <div class="flex items-center justify-between mb-4">
            <div v-if="editingList?.id === list.id" class="flex-1 flex gap-2 min-w-0">
                <label for="edit-list-title" class="sr-only">List name</label>
                <input id="edit-list-title" v-model="localEditName" type="text"
                    class="flex-1 min-w-0 px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
                    @keyup.enter="saveEditList" aria-label="List name" placeholder="Enter list name" autofocus />
                <button id="save-edit-list-button" @click="saveEditList"
                    class="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                    title="Save changes">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </button>
                <button id="cancel-edit-list-button" @click="cancelEditList"
                    class="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div v-else class="flex items-center gap-2 flex-1 min-w-0">
                <button :id="'move-list-button-' + list.id" draggable="true" @dragstart="handleDragStart"
                    @dragend="handleDragEnd"
                    class="p-1 text-gray-400 hover:text-blue-600 cursor-grab active:cursor-grabbing transition"
                    title="Move list" aria-label="Move list">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"
                        aria-hidden="true">
                        <circle cx="12" cy="6" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="18" r="1.5" />
                    </svg>
                </button>
                <h2 class="font-semibold text-lg text-slate-900 dark:text-slate-100 flex-1 truncate">{{ list.name }}
                </h2>
                <span
                    class="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">{{
                        list.cards.length }}</span>
                <button :id="'edit-list-button-' + list.id"
                    @click="onStartEditList && onStartEditList({ id: list.id, name: list.name })"
                    class="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Edit list"
                    aria-label="Edit list">
                    <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button :id="'delete-list-button-' + list.id" @click="deleteList(list.id)"
                    class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600" title="Delete list"
                    aria-label="Delete list">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- New card form -->
        <form @submit.prevent="createCard(list.id, list._newTitle, list._newDesc, list._newDue, list._newPriority)"
            class="space-y-2 mb-4 p-3 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 shadow-sm">
            <div class="space-y-2">
                <label :for="'new-card-title-' + list.id" class="sr-only">Card title</label>
                <input :id="'new-card-title-' + list.id" v-model="list._newTitle" placeholder="Card title"
                    aria-label="Card title"
                    class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div class="space-y-2">
                <label :for="'new-card-description-' + list.id" class="sr-only">Card description</label>
                <textarea :id="'new-card-description-' + list.id" v-model="list._newDesc"
                    placeholder="Description (optional)" rows="2" aria-label="Card description"
                    class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"></textarea>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 items-stretch">
                <div class="flex-1">
                    <label :for="'new-card-due-date-' + list.id" class="sr-only">Due date</label>
                    <input :id="'new-card-due-date-' + list.id" v-model="list._newDue" type="date" aria-label="Due date"
                        class="w-full sm:flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div class="w-full sm:w-36">
                    <label :for="'new-card-priority-' + list.id" class="sr-only">Priority</label>
                    <select :id="'new-card-priority-' + list.id" v-model.number="list._newPriority"
                        aria-label="Priority"
                        class="w-full min-w-0 text-sm px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option :value="1">🟢 Low</option>
                        <option :value="2">🟡 Medium</option>
                        <option :value="3">🔴 High</option>
                    </select>
                </div>
                <button :id="'add-card-button-' + list.id" type="submit"
                    class="w-full sm:w-auto px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition transform hover:scale-105 shrink-0"
                    aria-label="Add new card">
                    + Add
                </button>
            </div>
        </form>

        <!-- Cards container -->
        <div class="space-y-2 min-h-[100px]" :class="{ 'drag-over': false }"
            @dragover.prevent="(e) => onCardDragOver(e, list.id)" @drop.stop.prevent="(e) => onCardDrop(e, list.id)"
            @dragleave="(e) => onCardDragLeave(e)">
            <div v-if="false" class="mb-2">
                <div
                    class="h-16 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-900/20 animate-pulse">
                </div>
            </div>
            <div v-for="card in getSortedCards(list.cards)" :key="card.id" class="group relative">
                <CardItem :card="card" :listId="list.id" :editingCard="editingCard" :onEdit="startEditCard"
                    :onSave="updateCard" :onCancelEdit="cancelEditCard" :onDelete="deleteCard"
                    :onCardDragStart="onCardDragStart" :onCardTouchStart="onCardTouchStart"
                    :onCardTouchMove="onCardTouchMove" :onCardTouchEnd="onCardTouchEnd"
                    :onCardTouchCancel="onCardTouchCancel" :getPriorityColor="getPriorityColor"
                    :getPriorityLabel="getPriorityLabel" :formatDate="formatDate" :isOverdue="isOverdue" />
            </div>

            <div v-if="list.cards.length === 0" class="text-center py-8 text-slate-400 text-sm">No cards yet</div>
        </div>

    </div>
</template>

<style scoped>
.list-item {
    transition: transform 150ms ease, opacity 120ms ease, box-shadow 150ms ease, ring 150ms ease;
}

/* Remove any unexpected list markers inside list columns (some browsers/style resets
   may render elements with display:list-item and show markers). This ensures no
   stray bullets appear next to our card/list elements. */
.list-item,
.list-item * {
    list-style: none !important;
}

.list-item::marker,
summary::marker {
    display: none !important;
}
</style>
