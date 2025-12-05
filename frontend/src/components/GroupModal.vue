<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>{{ isEditing ? 'Modifier le groupe' : 'Créer un nouveau groupe' }}</h3>
        <button @click="closeModal" class="btn-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="group-name">Nom du groupe *</label>
          <input 
            id="group-name"
            v-model="groupName" 
            type="text" 
            placeholder="Ex: Équipe développement"
            maxlength="100"
            class="form-input"
            @keyup.enter="handleSubmit"
          />
        </div>
        
        <div class="form-group">
          <label for="group-description">Description</label>
          <textarea 
            id="group-description"
            v-model="groupDescription" 
            placeholder="Décrivez le groupe (optionnel)"
            maxlength="500"
            rows="3"
            class="form-textarea"
          ></textarea>
        </div>
        
        <div v-if="!isEditing" class="form-group">
          <label>Membres (optionnel)</label>
          <div class="search-members">
            <input 
              v-model="memberSearch" 
              type="text" 
              placeholder="Rechercher des utilisateurs..."
              class="form-input"
              @input="onSearchMembers"
            />
          </div>
          
          <!-- Liste des membres sélectionnés -->
          <div v-if="selectedMembers.length > 0" class="selected-members">
            <div v-for="member in selectedMembers" :key="member.id" class="member-chip">
              <span>{{ member.username }}</span>
              <button @click="removeMember(member.id)" class="chip-remove">×</button>
            </div>
          </div>
          
          <!-- Résultats de recherche -->
          <div v-if="memberSearchResults.length > 0" class="search-results">
            <button 
              v-for="user in memberSearchResults" 
              :key="user.id" 
              @click="addMember(user)"
              class="search-result-item"
              :disabled="selectedMembers.some(m => m.id === user.id)"
            >
              <span class="user-avatar-small">{{ user.username.charAt(0).toUpperCase() }}</span>
              <span>{{ user.username }}</span>
              <span v-if="selectedMembers.some(m => m.id === user.id)" class="added-check">✓</span>
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">Annuler</button>
        <button @click="handleSubmit" class="btn btn-primary" :disabled="loading || !groupName.trim()">
          <span v-if="loading">Traitement...</span>
          <span v-else>{{ isEditing ? 'Modifier' : 'Créer' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { groupsApi } from '../services/api'
import { usersApi } from '../services/api'
import authStore from '../stores/auth'

const props = defineProps({
  isOpen: Boolean,
  group: Object // Si fourni, on est en mode édition
})

const emit = defineEmits(['close', 'created', 'updated'])

const isEditing = computed(() => !!props.group)

const groupName = ref('')
const groupDescription = ref('')
const selectedMembers = ref([])
const memberSearch = ref('')
const memberSearchResults = ref([])
const searchTimeout = ref(null)
const loading = ref(false)
const error = ref('')

const currentUserId = computed(() => authStore.currentUser.value?.id)

// Charger les données du groupe en mode édition
watch(() => props.group, (newGroup) => {
  if (newGroup) {
    groupName.value = newGroup.name || ''
    groupDescription.value = newGroup.description || ''
    // Ne pas permettre de modifier les membres en édition (pour simplifier)
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  groupName.value = ''
  groupDescription.value = ''
  selectedMembers.value = []
  memberSearch.value = ''
  memberSearchResults.value = []
  error.value = ''
}

function closeModal() {
  resetForm()
  emit('close')
}

function onSearchMembers() {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  if (!memberSearch.value || memberSearch.value.length < 2) {
    memberSearchResults.value = []
    return
  }
  
  searchTimeout.value = setTimeout(async () => {
    try {
      const res = await usersApi.search(memberSearch.value)
      if (res?.success) {
        // Exclure l'utilisateur actuel et les membres déjà sélectionnés
        memberSearchResults.value = res.data.filter(u => 
          u.id !== currentUserId.value && !selectedMembers.value.some(m => m.id === u.id)
        )
      }
    } catch (err) {
      console.error('Failed to search members:', err)
    }
  }, 300)
}

function addMember(user) {
  if (!selectedMembers.value.some(m => m.id === user.id)) {
    selectedMembers.value.push(user)
    memberSearchResults.value = memberSearchResults.value.filter(u => u.id !== user.id)
  }
}

function removeMember(userId) {
  selectedMembers.value = selectedMembers.value.filter(m => m.id !== userId)
}

async function handleSubmit() {
  if (!groupName.value.trim()) {
    error.value = 'Le nom du groupe est requis'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    if (isEditing.value) {
      // Mode édition
      const res = await groupsApi.update(props.group.id, {
        name: groupName.value.trim(),
        description: groupDescription.value.trim()
      })
      
      if (res?.success) {
        emit('updated', res.data)
        closeModal()
      }
    } else {
      // Mode création
      const memberIds = selectedMembers.value.map(m => m.id)
      const res = await groupsApi.create(
        groupName.value.trim(),
        groupDescription.value.trim(),
        memberIds
      )
      
      if (res?.success) {
        emit('created', res.data)
        closeModal()
      }
    }
  } catch (err) {
    console.error('Failed to save group:', err)
    error.value = err.message || 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.btn-close {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-textarea {
  resize: vertical;
}

.selected-members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f1f5f9;
  border-radius: 16px;
  font-size: 13px;
  color: #334155;
}

.chip-remove {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.chip-remove:hover {
  background: #e2e8f0;
}

.search-results {
  margin-top: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: white;
  border: none;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  font-size: 14px;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover:not(:disabled) {
  background: #f8fafc;
}

.search-result-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.added-check {
  margin-left: auto;
  color: #10b981;
  font-size: 18px;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 12px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
