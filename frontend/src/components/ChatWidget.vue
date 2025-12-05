<template>
  <div class="chat-container">
    <!-- Bouton toggle pour ouvrir/fermer le chat -->
    <button 
      v-if="!isOpen" 
      @click="toggleChat" 
      class="chat-toggle-btn"
      :class="{ 'has-unread': unreadCount > 0 }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
    </button>

    <!-- Panel de chat -->
    <div v-if="isOpen" class="chat-panel">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-info">
          <h3>{{ currentView === 'general' ? 'Chat Général' : `Chat avec ${selectedUser?.username}` }}</h3>
          <span class="online-count">{{ onlineUsers.length }} en ligne</span>
        </div>
        <div class="chat-header-actions">
          <button @click="toggleUserList" class="btn-icon" title="Utilisateurs">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </button>
          <button @click="toggleChat" class="btn-icon btn-close" title="Fermer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="chat-body">
        <!-- Liste des utilisateurs (sidebar) -->
        <div v-if="showUserList" class="user-list">
          <div class="user-list-header">
            <h4>Utilisateurs en ligne</h4>
          </div>
          <div class="user-list-content">
            <button 
              @click="selectGeneralChat" 
              class="user-item"
              :class="{ active: currentView === 'general' }"
            >
              <span class="user-avatar general">🌐</span>
              <span class="user-name">Chat Général</span>
            </button>
            <div v-for="user in otherUsers" :key="user.userId" class="user-item-wrapper">
              <button 
                @click="selectPrivateChat(user)" 
                class="user-item"
                :class="{ active: selectedUser?.userId === user.userId }"
              >
                <span class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</span>
                <span class="user-name">{{ user.username }}</span>
                <span class="online-indicator"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone des messages -->
        <div class="messages-container" ref="messagesContainer">
          <div v-if="loading" class="loading-messages">
            <span>Chargement des messages...</span>
          </div>
          
          <div v-else-if="messages.length === 0" class="no-messages">
            <p>Aucun message. Commencez la conversation !</p>
          </div>
          
          <div v-else class="messages-list">
            <div 
              v-for="message in messages" 
              :key="message.id" 
              class="message"
              :class="{ 'own-message': message.sender === currentUserId }"
            >
              <div class="message-header">
                <span class="message-sender">{{ message.senderUsername }}</span>
                <span class="message-time">{{ formatTime(message.createdAt) }}</span>
              </div>
              <div class="message-content">{{ message.content }}</div>
            </div>
          </div>
          
          <!-- Indicateur de frappe -->
          <div v-if="typingUsers.length > 0" class="typing-indicator">
            <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? 'écrivent' : 'écrit' }}...</span>
          </div>
        </div>
      </div>

      <!-- Zone de saisie -->
      <div class="chat-footer">
        <form @submit.prevent="sendMessage" class="message-form">
          <input 
            v-model="newMessage" 
            type="text" 
            placeholder="Tapez votre message..."
            @input="handleTyping"
            @blur="stopTyping"
            class="message-input"
            maxlength="1000"
          />
          <button type="submit" class="send-btn" :disabled="!newMessage.trim()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import authStore from '../stores/auth'
import { socketService, chatApi } from '../services/socket'

// State
const isOpen = ref(false)
const showUserList = ref(false)
const loading = ref(false)
const messages = ref([])
const newMessage = ref('')
const onlineUsers = ref([])
const typingUsers = ref([])
const currentView = ref('general') // 'general' ou 'private'
const selectedUser = ref(null)
const unreadCount = ref(0)
const typingTimeout = ref(null)

// Computed
const currentUserId = computed(() => authStore.currentUser.value?.id)
const currentUserName = computed(() => authStore.currentUser.value?.username)

const otherUsers = computed(() => {
  return onlineUsers.value.filter(user => user.userId !== currentUserId.value)
})

// Methods
function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    unreadCount.value = 0
    connectSocket()
    loadMessages()
  }
}

function toggleUserList() {
  showUserList.value = !showUserList.value
}

function selectGeneralChat() {
  currentView.value = 'general'
  selectedUser.value = null
  loadMessages()
}

function selectPrivateChat(user) {
  currentView.value = 'private'
  selectedUser.value = user
  loadMessages()
}

async function connectSocket() {
  const token = authStore.token.value
  if (!token) return

  // Nettoyer les anciens listeners avant d'en ajouter de nouveaux
  socketService.removeAllListeners()

  socketService.connect(token)

  // Écouter les événements
  socketService.on('message:received', handleNewMessage)
  socketService.on('message:private:received', handleNewPrivateMessage)
  socketService.on('users:online', handleOnlineUsers)
  socketService.on('user:connected', handleUserConnected)
  socketService.on('user:disconnected', handleUserDisconnected)
  socketService.on('typing:update', handleTypingUpdate)
  socketService.on('error', handleError)
}

async function loadMessages() {
  loading.value = true
  try {
    let data
    if (currentView.value === 'general') {
      data = await chatApi.getMessages('general')
    } else if (selectedUser.value) {
      data = await chatApi.getPrivateMessages(selectedUser.value.userId)
    }
    
    if (data?.success) {
      messages.value = data.data
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    loading.value = false
  }
}

function handleNewMessage(message) {
  if (currentView.value === 'general' && message.room === 'general') {
    messages.value.push(message)
    scrollToBottom()
    
    if (!isOpen.value && message.sender !== currentUserId.value) {
      unreadCount.value++
    }
  }
}

function handleNewPrivateMessage(message) {
  // Vérifier si c'est un message de la conversation actuelle
  if (currentView.value === 'private' && selectedUser.value) {
    const expectedRoom = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    if (message.room === expectedRoom) {
      messages.value.push(message)
      scrollToBottom()
    }
  }
  
  if (!isOpen.value && message.sender !== currentUserId.value) {
    unreadCount.value++
  }
}

function handleOnlineUsers(users) {
  onlineUsers.value = users
}

function handleUserConnected(data) {
  onlineUsers.value = data.connectedUsers
}

function handleUserDisconnected(data) {
  onlineUsers.value = data.connectedUsers
  typingUsers.value = typingUsers.value.filter(u => u !== data.username)
}

function handleTypingUpdate(data) {
  if (data.isTyping) {
    if (!typingUsers.value.includes(data.username)) {
      typingUsers.value.push(data.username)
    }
  } else {
    typingUsers.value = typingUsers.value.filter(u => u !== data.username)
  }
}

function handleError(error) {
  console.error('Socket error:', error)
}

function sendMessage() {
  if (!newMessage.value.trim()) return

  if (currentView.value === 'general') {
    socketService.sendMessage(newMessage.value.trim())
  } else if (selectedUser.value) {
    socketService.sendPrivateMessage(newMessage.value.trim(), selectedUser.value.userId)
  }

  newMessage.value = ''
  stopTyping()
}

function handleTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }

  const room = currentView.value === 'general' ? 'general' : 
    [currentUserId.value, selectedUser.value?.userId].sort().join('-')
  
  socketService.startTyping(room)

  typingTimeout.value = setTimeout(() => {
    stopTyping()
  }, 2000)
}

function stopTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
    typingTimeout.value = null
  }
  
  const room = currentView.value === 'general' ? 'general' : 
    [currentUserId.value, selectedUser.value?.userId].sort().join('-')
  
  socketService.stopTyping(room)
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const messagesContainer = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Lifecycle
onMounted(() => {
  // Auto-connect si déjà authentifié
  if (authStore.token.value) {
    connectSocket()
  }

  // Déconnecter si l'utilisateur se déconnecte
  watch(() => authStore.token.value, (val) => {
    if (!val) {
      socketService.disconnect()
      messages.value = []
      onlineUsers.value = []
      unreadCount.value = 0
      selectedUser.value = null
      currentView.value = 'general'
    } else {
      // On re-connecte automatiquement si un token revient (login)
      connectSocket()
      loadMessages()
    }
  })
})

onUnmounted(() => {
  socketService.removeAllListeners()
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
})

// Watchers
watch(messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-toggle-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.chat-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.chat-toggle-btn.has-unread {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 4px 25px rgba(102, 126, 234, 0.7); }
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: bold;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-panel {
  width: 380px;
  height: 500px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.online-count {
  font-size: 12px;
  opacity: 0.8;
}

.chat-header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.user-list {
  width: 160px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.user-list-header {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.user-list-header h4 {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.user-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.user-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.user-item:hover {
  background: #e2e8f0;
}

.user-item.active {
  background: #667eea;
  color: white;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.user-avatar.general {
  background: #10b981;
}

.user-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.online-indicator {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.loading-messages,
.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 80%;
  align-self: flex-start;
}

.message.own-message {
  align-self: flex-end;
}

.message-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
}

.message-sender {
  font-weight: 600;
  color: #334155;
}

.own-message .message-sender {
  color: #667eea;
}

.message-time {
  color: #94a3b8;
}

.message-content {
  background: #f1f5f9;
  padding: 10px 14px;
  border-radius: 16px;
  border-top-left-radius: 4px;
  font-size: 14px;
  line-height: 1.4;
  color: #334155;
  word-wrap: break-word;
}

.own-message .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 4px;
}

.typing-indicator {
  padding: 8px 0;
  font-size: 12px;
  color: #64748b;
  font-style: italic;
}

.chat-footer {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.message-form {
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #667eea;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, opacity 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 480px) {
  .chat-panel {
    width: calc(100vw - 40px);
    height: calc(100vh - 100px);
    position: fixed;
    bottom: 80px;
    right: 20px;
  }
  
  .user-list {
    width: 140px;
  }
}
</style>
