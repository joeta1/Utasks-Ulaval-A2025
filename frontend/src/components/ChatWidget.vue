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
          <h3>{{ selectedUser ? `Chat avec ${selectedUser.username}` : 'Sélectionnez un utilisateur' }}</h3>
          <span class="online-count">{{ onlineUsers.length }} en ligne</span>
        </div>
        <div class="chat-header-actions">
          <button v-if="selectedUser" @click="goBack" class="btn-icon" title="Retour">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
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
            <h4>Utilisateurs</h4>
          </div>
          <div class="user-list-content">
            <!-- Chat général supprimé — seules les conversations privées sont disponibles -->
            <div v-for="user in displayedUsers" :key="user.userId" class="user-item-wrapper">
              <button
                @click="selectPrivateChat(user)"
                class="user-item"
                :class="{ active: selectedUser?.userId === user.userId }"
              >
                <span class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</span>
                <span class="user-name">{{ user.username }}</span>
                <span v-if="user.online" class="online-indicator"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Zone des messages : affichée seulement si une conversation privée est sélectionnée -->
        <div v-if="selectedUser" class="messages-container" ref="messagesContainer">
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
          <!-- Indicateur de nouveaux messages (flottant en bas) -->
          <div v-if="hasNewMessages" class="new-messages-indicator">
            <button class="new-messages-btn" @click="handleClickNewMessages">
              Nouveaux messages
              <span v-if="newMessagesCount > 1" class="new-messages-badge">{{ newMessagesCount }}</span>
            </button>
          </div>
          
          <!-- Indicateur de frappe -->
          <div v-if="typingUsers.length > 0" class="typing-indicator">
            <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? 'écrivent' : 'écrit' }}...</span>
          </div>
        </div>

        <!-- Placeholder when no conversation is selected -->
        <div v-else class="no-conversation-placeholder" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;">
          <div style="text-align:center;color:#64748b;">
            <p style="font-weight:600;margin-bottom:6px;">Aucune conversation sélectionnée</p>
            <p style="font-size:13px;">Choisissez un utilisateur dans la liste pour démarrer une discussion privée.</p>
          </div>
        </div>
      </div>

      <!-- Zone de saisie : affichée seulement si une conversation privée est sélectionnée -->
      <div v-if="selectedUser" class="chat-footer">
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
          <button type="submit" class="send-btn" :disabled="!newMessage.trim() || !selectedUser || (selectedUser && selectedUser.userId === currentUserId)">
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
const allUsers = ref([])
const typingUsers = ref([])
const currentView = ref('private') // only private conversations
const selectedUser = ref(null)
const unreadCount = ref(0)
const typingTimeout = ref(null)
const currentRoom = ref(null)

// Computed
const currentUserId = computed(() => authStore.currentUser.value?.id)
const currentUserName = computed(() => authStore.currentUser.value?.username)

const displayedUsers = computed(() => {
  // Merge registered users with online status and exclude the current user
  return allUsers.value
    .filter(u => u.id && u.id !== currentUserId.value)
    .map(u => {
      const isOnline = onlineUsers.value.some(ou => ou.userId === u.id)
      return { userId: u.id, username: u.username, online: isOnline }
    })
})

// Methods
async function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    unreadCount.value = 0
    await connectSocket()
    // If no conversation selected, show user list so user chooses a private chat
    if (!selectedUser.value) showUserList.value = true
    else loadMessages()
  }
}

/* Removed toggleUserList: users button logic disabled for now */

function selectPrivateChat(user) {
  // Open a private conversation with the selected user
  currentView.value = 'private'

  // Leave previous room if any
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }

  selectedUser.value = user
  showUserList.value = false

  // Join the private room for typing presence
  const room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
  currentRoom.value = room
  socketService.joinRoom(room)

  loadMessages()
}

function goBack() {
  // Quitter la conversation privée et revenir à la liste d'utilisateurs
  stopTyping()
  // Leave room
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }

  selectedUser.value = null
  messages.value = []
  loading.value = false
  showUserList.value = true
}

async function connectSocket() {
  const token = authStore.token.value
  if (!token) return

  // Nettoyer les anciens listeners avant d'en ajouter de nouveaux
  socketService.removeAllListeners()

  socketService.connect(token)

  // Écouter les événements (private only)
  socketService.on('message:private:received', handleNewPrivateMessage)
  socketService.on('users:online', handleOnlineUsers)
  socketService.on('user:connected', handleUserConnected)
  socketService.on('user:disconnected', handleUserDisconnected)
  socketService.on('typing:update', handleTypingUpdate)
  socketService.on('error', handleError)
  // Rejoindre la room actuelle si une conversation est déjà sélectionnée
  if (selectedUser.value) {
    const room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    currentRoom.value = room
    socketService.joinRoom(room)
  }
  // Charger la liste des utilisateurs enregistrés
  try {
    const res = await chatApi.getAllUsers()
    if (res?.success) {
      allUsers.value = res.data
    }
  } catch (err) {
    console.error('Failed to load users:', err)
  }
}

async function loadMessages() {
  loading.value = true
  try {
    let data
    if (selectedUser.value) {
      data = await chatApi.getPrivateMessages(selectedUser.value.userId)
    } else {
      messages.value = []
      loading.value = false
      return
    }
    
    if (data?.success) {
      messages.value = data.data
      // Lors du chargement initial d'une conversation, on veut être en bas
      atBottom.value = true
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    loading.value = false
  }
}

function handleNewPrivateMessage(message) {
  // Vérifier si c'est un message de la conversation actuelle
  if (selectedUser.value) {
    const expectedRoom = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    if (message.room === expectedRoom) {
      messages.value.push(message)
      // Ne scroller automatiquement que si l'utilisateur est déjà en bas
      if (messagesContainer.value) {
        if (isElementAtBottom(messagesContainer.value)) {
          atBottom.value = true
          scrollToBottom()
        } else {
          atBottom.value = false
          // Si l'utilisateur n'est pas en bas et le message vient d'un autre utilisateur,
          // afficher l'indicateur de nouveaux messages
          if (message.sender !== currentUserId.value) {
            hasNewMessages.value = true
            newMessagesCount.value = (newMessagesCount.value || 0) + 1
          }
        }
      } else {
        // fallback si la ref n'est pas prête
        scrollToBottom()
      }
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
  if (!newMessage.value.trim() || !selectedUser.value) return

  if (selectedUser.value.userId === currentUserId.value) return

  socketService.sendPrivateMessage(newMessage.value.trim(), selectedUser.value.userId)

  newMessage.value = ''
  stopTyping()
}

function handleTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }

  if (!selectedUser.value) return
  // Use currentRoom if available
  const room = currentRoom.value || [currentUserId.value, selectedUser.value.userId].sort().join('-')
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
  if (!selectedUser.value) return
  const room = currentRoom.value || [currentUserId.value, selectedUser.value.userId].sort().join('-')
  socketService.stopTyping(room)
}

function handleClickNewMessages() {
  hasNewMessages.value = false
  newMessagesCount.value = 0
  atBottom.value = true
  // Smooth scroll to bottom
  scrollToBottom(true)
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const messagesContainer = ref(null)
const atBottom = ref(true)
const hasNewMessages = ref(false)
const newMessagesCount = ref(0)

function isElementAtBottom(el, threshold = 20) {
  if (!el) return true
  const distance = el.scrollHeight - (el.scrollTop + el.clientHeight)
  return distance <= threshold
}

function onMessagesContainerScroll() {
  if (!messagesContainer.value) return
  const wasAtBottom = atBottom.value
  atBottom.value = isElementAtBottom(messagesContainer.value)
  // If user scrolled to bottom, clear new message indicator
  if (atBottom.value && !wasAtBottom) {
    hasNewMessages.value = false
    newMessagesCount.value = 0
  }
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    if (messagesContainer.value) {
      const top = messagesContainer.value.scrollHeight
      if (smooth && typeof messagesContainer.value.scrollTo === 'function') {
        messagesContainer.value.scrollTo({ top, behavior: 'smooth' })
      } else {
        messagesContainer.value.scrollTop = top
      }
    }
  })
}

// Attacher/détacher l'écouteur de scroll quand l'élément est rendu
watch(messagesContainer, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('scroll', onMessagesContainerScroll)
  if (el) el.addEventListener('scroll', onMessagesContainerScroll)
}, { immediate: true })

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
      currentView.value = 'private'
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
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }
  // Detach scroll listener if still attached
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('scroll', onMessagesContainerScroll)
  }
})

// Watchers
watch(messages, () => {
  if (atBottom.value) scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.new-messages-indicator {
  position: absolute;
  right: 16px;
  bottom: 72px; /* place above the input area */
  z-index: 20;
}
.new-messages-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 20px;
  box-shadow: 0 6px 18px rgba(102,126,234,0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.new-messages-badge {
  background: rgba(255,255,255,0.15);
  color: #fff;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}
</style>

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
