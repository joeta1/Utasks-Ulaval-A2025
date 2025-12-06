
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import authStore from '../stores/auth'
import { socketService, chatApi } from '../services/socket'
import { usersApi, groupsApi } from '../services/api'
import GroupModal from './GroupModal.vue'

// State
const isOpen = ref(false)
const showUserList = ref(false)
const loading = ref(false)
const messages = ref([])
const newMessage = ref('')
const onlineUsers = ref([])
const allUsers = ref([])
const typingUsers = ref([])
const currentView = ref('private') // private or group
const selectedUser = ref(null)
const selectedGroup = ref(null)
const unreadMap = ref({})
const unreadCount = computed(() => {
  const privateUnread = Object.values(unreadMap.value).reduce((s, v) => s + (v || 0), 0)
  const groupUnread = Object.values(groupUnreadMap.value).reduce((s, v) => s + (v || 0), 0)
  return privateUnread + groupUnread
})
const typingTimeout = ref(null)
const currentRoom = ref(null)

// Group state
const myGroups = ref([])
const showGroupModal = ref(false)
const showMembersModal = ref(false)
const groupMembers = ref([])
const groupUnreadMap = ref({})

// Search state
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchDebounceTimeout = ref(null)
const minSearchLength = 2
const recentUserIds = ref(new Set())

// Computed
const currentUserId = computed(() => authStore.currentUser.value?.id)
const currentUserName = computed(() => authStore.currentUser.value?.username)

const headerTitle = computed(() => {
  if (selectedGroup.value) {
    return `Group: ${selectedGroup.value.name}`
  }
  if (selectedUser.value) {
    return `Chat with ${selectedUser.value.username}`
  }
  return 'Select a conversation'
})

const isGroupCreator = computed(() => {
  if (!selectedGroup.value) return false
  const creatorId = selectedGroup.value.creator?.id || selectedGroup.value.creator
  return creatorId === currentUserId.value
})

const displayedUsers = computed(() => {
  // Merge registered users with online status and exclude the current user
  return allUsers.value
    .filter(u => u.id && u.id !== currentUserId.value)
    .map(u => {
      const isOnline = onlineUsers.value.some(ou => ou.userId === u.id)
      return { userId: u.id, username: u.username, online: isOnline, unreadCount: unreadMap.value[u.id] || 0 }
    })
})

const recentConversations = computed(() => {
  // Users with whom there have already been conversations (present in recentUserIds)
  const recent = Array.from(recentUserIds.value)
    .filter(userId => userId !== currentUserId.value) // Exclude current user
    .map(userId => {
      const user = allUsers.value.find(u => u.id === userId)
      if (!user) return null
      const isOnline = onlineUsers.value.some(ou => ou.userId === user.id)
      return { 
        userId: user.id, 
        username: user.username, 
        online: isOnline, 
        unreadCount: unreadMap.value[user.id] || 0 
      }
    })
    .filter(u => u !== null)
    .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0)) // Priorité aux messages non lus
  return recent
})

// Générer une couleur basée sur l'ID de l'utilisateur
function getUserColor(userId) {
  if (!userId) return '#667eea'
  
  // Palette de couleurs distinctes et agréables
  const colors = [
    '#667eea', // violet
    '#10b981', // vert
    '#f59e0b', // orange
    '#ef4444', // rouge
    '#3b82f6', // bleu
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange foncé
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#6366f1', // indigo
  ]
  
  // Hash simple de l'userId pour obtenir un index
  let hash = 0
  const str = userId.toString()
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

// Methods
async function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
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
  selectedGroup.value = null
  showUserList.value = false

  // Add to recent conversations (only if not current user)
  if (user.userId !== currentUserId.value) {
    recentUserIds.value.add(user.userId)
    saveRecentConversations()
  }

  // Mark this conversation as read (clear unread count)
  if (unreadMap.value[user.userId]) {
    unreadMap.value = { ...unreadMap.value, [user.userId]: 0 }
  }

  // Join the private room for typing presence
  const room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
  currentRoom.value = room
  socketService.joinRoom(room)

  loadMessages()
}

function selectGroupChat(group) {
  // Open a group conversation
  currentView.value = 'group'

  // Leave previous room if any
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }

  selectedGroup.value = group
  selectedUser.value = null
  showUserList.value = false

  // Mark this group conversation as read
  if (groupUnreadMap.value[group.id]) {
    groupUnreadMap.value = { ...groupUnreadMap.value, [group.id]: 0 }
  }

  // Join the group room
  const room = `group-${group.id}`
  currentRoom.value = room
  socketService.joinRoom(room)

  loadMessages()
}

function goBack() {
  // Leave private conversation or group and return to list
  stopTyping()
  // Leave room
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }

  selectedUser.value = null
  selectedGroup.value = null
  messages.value = []
  loading.value = false
  showUserList.value = true
}

async function connectSocket() {
  const token = authStore.token.value
  if (!token) return

  // Clean old listeners before adding new ones
  socketService.removeAllListeners()

  socketService.connect(token)

  // Listen to events (private and group)
  socketService.on('message:private:received', handleNewPrivateMessage)
  socketService.on('message:group:received', handleNewGroupMessage)
  socketService.on('group:member:added', handleGroupMemberAdded)
  socketService.on('group:member:removed', handleGroupMemberRemoved)
  socketService.on('group:deleted', handleGroupDeleted)
  socketService.on('users:online', handleOnlineUsers)
  socketService.on('user:connected', handleUserConnected)
  socketService.on('user:disconnected', handleUserDisconnected)
  socketService.on('typing:update', handleTypingUpdate)
  socketService.on('message:private:updated', handleUpdatedPrivateMessage)
  socketService.on('message:private:deleted', handleDeletedPrivateMessage)
  socketService.on('error', handleError)
  // Join the current room if a conversation is already selected
  if (selectedUser.value) {
    const room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    currentRoom.value = room
    socketService.joinRoom(room)
  }
  // Load the list of registered users (without search, just for the complete list in memory)
  try {
    const res = await chatApi.getAllUsers()
    if (res?.success) {
      allUsers.value = res.data
      // Ensure unreadMap has an entry for each user
      res.data.forEach(u => {
        if (u.id && u.id !== currentUserId.value) {
          if (unreadMap.value[u.id] == null) {
            unreadMap.value = { ...unreadMap.value, [u.id]: 0 }
          }
        }
      })
    }
  } catch (err) {
    console.error('Failed to load users:', err)
  }
  
  // Load recent conversations from localStorage
  loadRecentConversations()
  
  // Load user's groups
  await loadGroups()
  
  // Automatically join all groups
  myGroups.value.forEach(group => {
    socketService.joinRoom(`group-${group.id}`)
  })
}

async function loadGroups() {
  try {
    const res = await groupsApi.getAll()
    if (res?.success) {
      myGroups.value = res.data.map(g => ({
        ...g,
        unreadCount: groupUnreadMap.value[g.id] || 0
      }))
    }
  } catch (err) {
    console.error('Failed to load groups:', err)
  }
}

function openGroupModal() {
  showGroupModal.value = true
}

async function deleteGroup() {
  if (!selectedGroup.value) return
  
  const groupId = selectedGroup.value.id
  const groupName = selectedGroup.value.name
  
  const confirmed = confirm(`Are you sure you want to delete the group "${groupName}"? This action is irreversible.`)
  if (!confirmed) return
  
  try {
    const res = await groupsApi.delete(groupId)
    if (res?.success) {
      // Quitter la room socket
      if (currentRoom.value) {
        socketService.leaveRoom(currentRoom.value)
        currentRoom.value = null
      }
      
      // Return to list and reset
      selectedGroup.value = null
      showUserList.value = true
      messages.value = []
      
      // Remove group from list
      myGroups.value = myGroups.value.filter(g => g.id !== groupId)
      
      console.log('Group deleted successfully')
    }
  } catch (err) {
    console.error('Failed to delete group:', err)
    alert('Error deleting group: ' + (err.message || 'Unknown error'))
  }
}

async function showGroupMembersModal() {
  if (!selectedGroup.value) return
  
  try {
    const res = await groupsApi.getById(selectedGroup.value.id)
    if (res?.success && res.data) {
      // Update selectedGroup with full details
      selectedGroup.value = { ...selectedGroup.value, ...res.data }
      groupMembers.value = res.data.members || []
      console.log('Group members loaded:', groupMembers.value)
      showMembersModal.value = true
    }
  } catch (err) {
    console.error('Failed to load group members:', err)
    alert('Error loading members: ' + (err.message || 'Unknown error'))
  }
}

function closeMembersModal() {
  showMembersModal.value = false
  groupMembers.value = []
}

async function leaveGroup() {
  if (!selectedGroup.value || !currentUserId.value) return
  
  const groupId = selectedGroup.value.id
  const groupName = selectedGroup.value.name
  
  const confirmed = confirm(`Are you sure you want to leave the group "${groupName}"?`)
  if (!confirmed) return
  
  try {
    const res = await groupsApi.removeMember(groupId, currentUserId.value)
    if (res?.success) {
      // Leave the socket room
      if (currentRoom.value) {
        socketService.leaveRoom(currentRoom.value)
        currentRoom.value = null
      }
      
      // Close modal and return to list
      closeMembersModal()
      selectedGroup.value = null
      showUserList.value = true
      messages.value = []
      
      // Remove group from list
      myGroups.value = myGroups.value.filter(g => g.id !== groupId)
      
      console.log('You left the group')
    }
  } catch (err) {
    console.error('Failed to leave group:', err)
    alert('Error leaving group: ' + (err.message || 'Unknown error'))
  }
}

async function onGroupCreated(group) {
  // Add the new group to the list
  myGroups.value.push({
    ...group,
    unreadCount: 0
  })
  
  // Automatically join the group room
  const room = `group-${group.id}`
  socketService.joinRoom(room)
  
  // Open the created group
  selectGroupChat(group)
}

async function loadMessages() {
  loading.value = true
  try {
    let data
    if (selectedUser.value) {
      data = await chatApi.getPrivateMessages(selectedUser.value.userId)
    } else if (selectedGroup.value) {
      data = await chatApi.getGroupMessages(selectedGroup.value.id)
    } else {
      messages.value = []
      loading.value = false
      return
    }
    
    if (data?.success) {
      messages.value = data.data
      // when loading messages, consider we are at the bottom
      atBottom.value = true
      // Mark all as read
      lastReadMessageId.value = messages.value.length ? messages.value[messages.value.length - 1].id : null
      newMessagesStartIndex.value = null
      newMessagesCount.value = 0
      hasNewMessages.value = false
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    loading.value = false
  }
}

// Search functions
function onSearchInput() {
  // Clear previous timeout
  if (searchDebounceTimeout.value) {
    clearTimeout(searchDebounceTimeout.value)
  }
  
  // Reset results if query is too short
  if (!searchQuery.value || searchQuery.value.length < minSearchLength) {
    searchResults.value = []
    return
  }
  
  // Debounce the search
  searchDebounceTimeout.value = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value || searchQuery.value.length < minSearchLength) {
    searchResults.value = []
    return
  }
  
  searchLoading.value = true
  try {
    const res = await usersApi.search(searchQuery.value)
    if (res?.success) {
      // Filter out current user and map to display format
      searchResults.value = res.data
        .filter(u => u.id !== currentUserId.value)
        .map(u => {
          const isOnline = onlineUsers.value.some(ou => ou.userId === u.id)
          return {
            userId: u.id,
            username: u.username,
            online: isOnline,
            unreadCount: unreadMap.value[u.id] || 0
          }
        })
    }
  } catch (err) {
    console.error('Search failed:', err)
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  if (searchDebounceTimeout.value) {
    clearTimeout(searchDebounceTimeout.value)
  }
}

// Recent conversations management
function loadRecentConversations() {
  try {
    const stored = localStorage.getItem('chat-recent-conversations')
    if (stored) {
      const parsed = JSON.parse(stored)
      recentUserIds.value = new Set(parsed)
    }
  } catch (err) {
    console.error('Failed to load recent conversations:', err)
    recentUserIds.value = new Set()
  }
}

function saveRecentConversations() {
  try {
    const arr = Array.from(recentUserIds.value)
    localStorage.setItem('chat-recent-conversations', JSON.stringify(arr))
  } catch (err) {
    console.error('Failed to save recent conversations:', err)
  }
}

function handleNewPrivateMessage(message) {
  // Check if it's a message from the currently opened and visible conversation
  if (selectedUser.value && isOpen.value) {
    const expectedRoom = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    if (message.room === expectedRoom) {
      messages.value.push(message)
      console.debug('[chat] new private message', {
        id: message.id,
        sender: message.sender,
        currentUserId: currentUserId.value,
        messagesLength: messages.value.length
      })
      // Only auto-scroll if the user is already at the bottom
      if (messagesContainer.value) {
        if (isElementAtBottom(messagesContainer.value)) {
          atBottom.value = true
          scrollToBottom()
          // mark the message as read if we are at the bottom
          lastReadMessageId.value = message.id
        } else {
          atBottom.value = false
          // If the user is not at the bottom and the message is from another user,
          // show the new messages indicator
          if (message.sender !== currentUserId.value) {
            console.debug('[chat] marking newMessagesStartIndex (first unread) at index', messages.value.length - 1)
            // if this is the first new message since the last read,
            // record the index where to start the "New messages" area
            if (newMessagesStartIndex.value === null) {
              newMessagesStartIndex.value = messages.value.length - 1
            }
            hasNewMessages.value = true
            newMessagesCount.value = (newMessagesCount.value || 0) + 1
          }
        }
      } else {
        // fallback if the ref is not ready
        scrollToBottom()
      }
      return
    }
  }
  
  // Message pour une autre conversation (ou chat fermé, ou conversation non visible)
  if (message.sender !== currentUserId.value) {
    // increment unread count for that sender
    const sid = message.sender
    const next = (unreadMap.value[sid] || 0) + 1
    unreadMap.value = { ...unreadMap.value, [sid]: next }
    console.debug('[chat] increment unread for', sid, '->', next)
    
    // Update the badge in recentConversations
    const userInRecent = recentConversations.value.find(u => u.userId === sid)
    if (userInRecent) {
      userInRecent.unreadCount = next
    }
    
    // Add the user to recent conversations (only if not current user)
    if (sid !== currentUserId.value) {
      recentUserIds.value.add(sid)
      saveRecentConversations()
    }
  }
}

function handleNewGroupMessage(message) {
  // Check if it's a message from the currently opened and visible group
  if (selectedGroup.value && isOpen.value) {
    const expectedRoom = `group-${selectedGroup.value.id}`
    if (message.room === expectedRoom) {
      messages.value.push(message)
      console.debug('[chat] new group message', {
        id: message.id,
        sender: message.sender,
        group: message.group,
        messagesLength: messages.value.length
      })
      // Only auto-scroll if the user is already at the bottom
      if (messagesContainer.value) {
        if (isElementAtBottom(messagesContainer.value)) {
          atBottom.value = true
          scrollToBottom()
          lastReadMessageId.value = message.id
        } else {
          atBottom.value = false
          if (message.sender !== currentUserId.value) {
            if (newMessagesStartIndex.value === null) {
              newMessagesStartIndex.value = messages.value.length - 1
            }
            hasNewMessages.value = true
            newMessagesCount.value = (newMessagesCount.value || 0) + 1
          }
        }
      } else {
        scrollToBottom()
      }
      return
    }
  }
  
  // Message for another group (or chat closed)
  if (message.sender !== currentUserId.value && message.group) {
    // Increment unread message count for this group
    const gid = message.group
    const next = (groupUnreadMap.value[gid] || 0) + 1
    groupUnreadMap.value = { ...groupUnreadMap.value, [gid]: next }
    console.debug('[chat] increment group unread for', gid, '->', next)
    
    // Update the count in myGroups reactively
    const groupIndex = myGroups.value.findIndex(g => g.id === gid)
    if (groupIndex !== -1) {
      myGroups.value = myGroups.value.map((g, idx) => 
        idx === groupIndex ? { ...g, unreadCount: next } : g
      )
    }
  }
}

function handleUpdatedPrivateMessage(message) {
  // Update the existing message in the view if it belongs to the current room
  try {
    if (selectedUser.value) {
      const expectedRoom = [currentUserId.value, selectedUser.value.userId].sort().join('-')
      if (message.room === expectedRoom) {
        const idx = messages.value.findIndex(m => (m.id || m._id) === (message.id || message._id))
        if (idx !== -1) {
          // merge important fields
          messages.value[idx].content = message.content
          messages.value[idx].edited = true
          messages.value[idx].editedAt = message.editedAt || new Date().toISOString()
        }
      }
    }
  } catch (err) {
    console.error('Error handling updated private message', err)
  }
}

function handleDeletedPrivateMessage(message) {
  try {
    if (selectedUser.value) {
      const expectedRoom = [currentUserId.value, selectedUser.value.userId].sort().join('-')
      if (message.room === expectedRoom) {
        const idx = messages.value.findIndex(m => (m.id || m._id) === (message.id || message._id))
        if (idx !== -1) {
          // remove the message from the array (hard delete)
          messages.value.splice(idx, 1)
        }
      }
    }
  } catch (err) {
    console.error('Error handling deleted private message', err)
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
  // make sure it's for the current room
  if (data.room !== currentRoom.value) return
  
  if (data.isTyping) {
    if (!typingUsers.value.includes(data.username)) {
      typingUsers.value.push(data.username)
    }
  } else {
    typingUsers.value = typingUsers.value.filter(u => u !== data.username)
  }
}

function handleGroupMemberAdded(data) {
  // If it's for the current user, add the group to the list
  if (data.userId === currentUserId.value) {
    console.debug('[chat] added to group', data.group.name)
    // Add the group to the list
    if (!myGroups.value.some(g => g.id === data.group.id)) {
      myGroups.value.push({
        ...data.group,
        unreadCount: 0
      })
      // Automatically join the group room
      socketService.joinRoom(`group-${data.group.id}`)
    }
  }
  // If we're already in this group, reload the info
  else if (selectedGroup.value?.id === data.groupId) {
    // Optional: reload group details to see new members
    loadGroups()
  }
}

function handleGroupDeleted(data) {
  // If it's for the current user, remove the group from the list
  if (data.userId === currentUserId.value) {
    console.debug('[chat] group deleted', data.groupId)
    
    // Remove the group from the list
    myGroups.value = myGroups.value.filter(g => g.id !== data.groupId)
    
    // If we're in this group, return to list
    if (selectedGroup.value?.id === data.groupId) {
      // Leave the socket room
      if (currentRoom.value) {
        socketService.leaveRoom(currentRoom.value)
        currentRoom.value = null
      }
      
      selectedGroup.value = null
      showUserList.value = true
      messages.value = []
    }
  }
}

function handleGroupMemberRemoved(data) {
  // If the current user was removed, remove the group from the list
  if (data.userId === currentUserId.value) {
    console.debug('[chat] removed from group', data.groupId)
    
    // Remove the group from the list
    myGroups.value = myGroups.value.filter(g => g.id !== data.groupId)
    
    // If we're in this group, return to list
    if (selectedGroup.value?.id === data.groupId) {
      // Leave the socket room
      if (currentRoom.value) {
        socketService.leaveRoom(currentRoom.value)
        currentRoom.value = null
      }
      
      selectedGroup.value = null
      showUserList.value = true
      messages.value = []
    }
  }
  // If we're in the group and another member was removed, update the member list
  else if (selectedGroup.value?.id === data.groupId && showMembersModal.value) {
    // Reload the member list if the modal is open
    showGroupMembersModal()
  }
}

function handleError(error) {
  console.error('Socket error:', error)
}

function sendMessage() {
  if (!newMessage.value.trim()) return
  
  if (selectedUser.value) {
    // private message
    if (selectedUser.value.userId === currentUserId.value) return
    socketService.sendPrivateMessage(newMessage.value.trim(), selectedUser.value.userId)
  } else if (selectedGroup.value) {
    // group message
    socketService.sendGroupMessage(newMessage.value.trim(), selectedGroup.value.id)
  } else {
    return
  }

  newMessage.value = ''
  stopTyping()
}

function handleTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }

  // Support private conversations and groups
  if (!selectedUser.value && !selectedGroup.value) return
  
  // Use currentRoom if available, else compute
  let room = currentRoom.value
  if (!room) {
    if (selectedUser.value) {
      room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    } else if (selectedGroup.value) {
      room = `group-${selectedGroup.value.id}`
    }
  }
  
  if (room) {
    socketService.startTyping(room)
  }

  typingTimeout.value = setTimeout(() => {
    stopTyping()
  }, 2000)
}

// Emoji picker state and helpers
const emojis = ['😀','😂','😊','😍','😢','👍','🎉','🔥','🚀','🤝']
const showEmojiPicker = ref(false)
const messageInput = ref(null)
const emojiWrapper = ref(null)

// Edition de message
const editingMessageId = ref(null)
const editingContent = ref('')

function startEdit(message) {
  if (!message || message.sender !== currentUserId.value) return
  editingMessageId.value = message.id || message._id
  editingContent.value = message.content
  // focus after next tick if desired
  nextTick(() => {
    const el = document.getElementById(`edit-input-${editingMessageId.value}`)
    if (el) el.focus()
  })
}

function cancelEdit() {
  editingMessageId.value = null
  editingContent.value = ''
}

async function submitEdit(message) {
  if (!editingMessageId.value) return
  const trimmed = (editingContent.value || '').trim()
  if (!trimmed) return
  try {
    const res = await chatApi.updateMessage(editingMessageId.value, trimmed)
    if (res?.success && res.data) {
      // Update local message
      const idx = messages.value.findIndex(m => (m.id || m._id) === editingMessageId.value)
      if (idx !== -1) {
        messages.value[idx].content = res.data.content
        messages.value[idx].edited = true
        messages.value[idx].editedAt = res.data.editedAt
      }
      // clear editing state
      cancelEdit()
    }
  } catch (err) {
    console.error('Failed to update message', err)
  }
}


async function submitDelete(message) {
  if (!message) return
  // Only allow deleting own messages
  if (message.sender !== currentUserId.value) return
  const ok = window.confirm('Delete this message? This action is irreversible.')
  if (!ok) return
  try {
    const res = await chatApi.deleteMessage(message.id || message._id)
    if (res?.success && res.data) {
      const idx = messages.value.findIndex(m => (m.id || m._id) === (res.data.id || res.data._id))
      if (idx !== -1) {
        // remove from local messages (hard delete)
        messages.value.splice(idx, 1)
      }
    }
  } catch (err) {
    console.error('Failed to delete message', err)
  }
}
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
  if (showEmojiPicker.value) {
    // focus input so selection positions are available
    nextTick(() => messageInput.value && messageInput.value.focus())
  }
}

function insertEmoji(emoji) {
  const input = messageInput.value
  if (input && typeof input.selectionStart === 'number') {
    const start = input.selectionStart
    const end = input.selectionEnd
    const val = newMessage.value || ''
    newMessage.value = val.slice(0, start) + emoji + val.slice(end)
    nextTick(() => {
      const pos = start + emoji.length
      try { input.setSelectionRange(pos, pos) } catch (e) { /* ignore */ }
      input.focus()
    })
  } else {
    newMessage.value = (newMessage.value || '') + emoji
    nextTick(() => messageInput.value && messageInput.value.focus())
  }
  showEmojiPicker.value = false
}

function hideIfClickedOutside(e) {
  if (!emojiWrapper.value) return
  if (!emojiWrapper.value.contains(e.target)) {
    showEmojiPicker.value = false
  }
}

function stopTyping() {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
    typingTimeout.value = null
  }
  
  // Support private conversations and groups
  if (!selectedUser.value && !selectedGroup.value) return
  
  // User currentRoom if available, else compute
  let room = currentRoom.value
  if (!room) {
    if (selectedUser.value) {
      room = [currentUserId.value, selectedUser.value.userId].sort().join('-')
    } else if (selectedGroup.value) {
      room = `group-${selectedGroup.value.id}`
    }
  }
  
  if (room) {
    socketService.stopTyping(room)
  }
}

function handleClickNewMessages() {
  hasNewMessages.value = false
  newMessagesCount.value = 0
  atBottom.value = true
  // Smooth scroll to bottom
  scrollToBottom(true)
  // Marquer tout comme lu
  newMessagesStartIndex.value = null
  lastReadMessageId.value = messages.value.length ? messages.value[messages.value.length - 1].id : null
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
const newMessagesStartIndex = ref(null)
const lastReadMessageId = ref(null)

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
    console.debug('[chat] user scrolled to bottom — clearing new messages markers', {
      messagesLength: messages.value.length
    })
    hasNewMessages.value = false
    newMessagesCount.value = 0
    newMessagesStartIndex.value = null
    // mark the last message as read
    lastReadMessageId.value = messages.value.length ? messages.value[messages.value.length - 1].id : null
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

// Attach/detach scroll listener when the element is rendered
watch(messagesContainer, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('scroll', onMessagesContainerScroll)
  if (el) el.addEventListener('scroll', onMessagesContainerScroll)
}, { immediate: true })

// Lifecycle
onMounted(() => {
  // Auto-connect if already authenticated
  if (authStore.token.value) {
    connectSocket()
  }

  // DDisconnect if the user logs out
  watch(() => authStore.token.value, (val) => {
    if (!val) {
      socketService.disconnect()
      messages.value = []
      onlineUsers.value = []
      unreadMap.value = {}
      selectedUser.value = null
      currentView.value = 'private'
    } else {
      // recconect if token becomes available
      connectSocket()
      loadMessages()
    }
  })
})

// Listen for clicks outside the emoji area to hide the picker
onMounted(() => {
  document.addEventListener('click', hideIfClickedOutside)
})

onUnmounted(() => {
  socketService.removeAllListeners()
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
  if (searchDebounceTimeout.value) {
    clearTimeout(searchDebounceTimeout.value)
  }
  if (currentRoom.value) {
    socketService.leaveRoom(currentRoom.value)
    currentRoom.value = null
  }
  // Detach scroll listener if still attached
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('scroll', onMessagesContainerScroll)
  }
  // Remove outside-click listener for emoji picker
  document.removeEventListener('click', hideIfClickedOutside)
})

// Watchers
watch(messages, () => {
  if (atBottom.value) scrollToBottom()
}, { deep: true })
</script>

<template>
  <div class="chat-container">
    <!-- toggle for chat open/close -->
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

    <!--chat panel -->
    <div v-if="isOpen" class="chat-panel">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-info">
          <h3>{{ headerTitle }}</h3>
          <span class="online-count">{{ onlineUsers.length }} online</span>
        </div>
        <div class="chat-header-actions">
          <button v-if="selectedUser || selectedGroup" @click="goBack" class="btn-icon" title="Back">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button v-if="selectedGroup" @click="showGroupMembersModal" class="btn-icon" title="View members">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </button>
          <button v-if="selectedGroup && isGroupCreator" @click="deleteGroup" class="btn-icon btn-delete" title="Delete group">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <button @click="toggleChat" class="btn-icon btn-close" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Main content -->
      <div class="chat-body">
        <!-- User list (sidebar) -->
        <div v-if="showUserList" class="user-list">
          <!-- Search bar -->
          <div class="search-bar">
            <input 
              v-model="searchQuery"
              @input="onSearchInput"
              type="text" 
              placeholder="Search for a user..."
              class="search-input"
            />
            <svg v-if="!searchQuery" class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <button v-else @click="clearSearch" class="clear-search-btn" title="Clear">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Create group button -->
          <div class="create-group-section">
            <button @click="openGroupModal" class="btn-create-group" title="Create group">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>New group</span>
            </button>
          </div>

          <div class="user-list-content">
            <!-- Section: Recent conversations -->
            <div v-if="recentConversations.length > 0 && !searchQuery" class="user-section">
              <h4 class="section-title">Recent conversations</h4>
              <div v-for="user in recentConversations" :key="user.userId" class="user-item-wrapper">
                <button
                  @click="selectPrivateChat(user)"
                  class="user-item"
                  :class="{ active: selectedUser?.userId === user.userId }"
                >
                  <span class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</span>
                  <span class="user-name" :class="{ unread: user.unreadCount > 0 }">{{ user.username }}</span>
                  <span v-if="user.unreadCount > 0" class="user-unread-badge">{{ user.unreadCount }}</span>
                  <span v-if="user.online" class="online-indicator"></span>
                </button>
              </div>
            </div>

            <!-- Section: Groups -->
            <div v-if="myGroups.length > 0 && !searchQuery" class="user-section">
              <h4 class="section-title">My groups</h4>
              <div v-for="group in myGroups" :key="group.id" class="user-item-wrapper">
                <button
                  @click="selectGroupChat(group)"
                  class="user-item"
                  :class="{ active: selectedGroup?.id === group.id }"
                >
                  <span class="user-avatar group-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <span class="user-name" :class="{ unread: group.unreadCount > 0 }">{{ group.name }}</span>
                  <span v-if="group.unreadCount > 0" class="user-unread-badge">{{ group.unreadCount }}</span>
                </button>
              </div>
            </div>

            <!-- Section: Search results -->
            <div v-if="searchQuery && searchQuery.length >= minSearchLength" class="user-section">
              <h4 class="section-title">Search results</h4>
              <div v-if="searchLoading" class="search-loading">
                <span>Searching...</span>
              </div>
              <div v-else-if="searchResults.length === 0" class="no-results">
                <p>No users found</p>
              </div>
              <div v-else v-for="user in searchResults" :key="user.userId" class="user-item-wrapper">
                <button
                  @click="selectPrivateChat(user)"
                  class="user-item"
                  :class="{ active: selectedUser?.userId === user.userId }"
                >
                  <span class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</span>
                  <span class="user-name" :class="{ unread: user.unreadCount > 0 }">{{ user.username }}</span>
                  <span v-if="user.unreadCount > 0" class="user-unread-badge">{{ user.unreadCount }}</span>
                  <span v-if="user.online" class="online-indicator"></span>
                </button>
              </div>
            </div>

            <!-- Help message if nothing is displayed -->
            <div v-if="!searchQuery && recentConversations.length === 0" class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p style="margin-top:12px;font-size:13px;color:#64748b;">Search for a user to start a conversation</p>
            </div>
            
            <div v-if="searchQuery && searchQuery.length < minSearchLength" class="search-hint">
              <p>Type at least {{ minSearchLength }} characters to search</p>
            </div>
          </div>
        </div>

        <!-- Messages area: displayed only if a private conversation or group is selected -->
        <div v-if="selectedUser || selectedGroup" class="messages-container" ref="messagesContainer">
          <div v-if="loading" class="loading-messages">
            <span>Loading messages...</span>
          </div>
          
          <div v-else-if="messages.length === 0" class="no-messages">
            <p>No messages. Start the conversation!</p>
          </div>
          
          <div v-else class="messages-list">
            <div 
              v-for="(message, index) in messages" 
              :key="message.id" 
            >
              <!-- 'New messages' bar: inserted once before the first unread message -->
              <div v-if="hasNewMessages && newMessagesStartIndex !== null && index === newMessagesStartIndex" class="new-messages-divider">
                <span class="divider-text">New messages</span>
              </div>

              <div class="message" :class="{ 'own-message': message.sender === currentUserId }">
                <div class="message-header">
                  <span 
                    class="message-sender" 
                    :style="selectedGroup && message.sender !== currentUserId ? { color: getUserColor(message.sender) } : {}"
                  >
                    {{ message.senderUsername }}
                  </span>
                  <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                </div>

                <div class="message-actions" v-if="message.sender === currentUserId && editingMessageId !== (message.id || message._id)">
                  <button @click="startEdit(message)" class="btn-icon small" title="Edit">✏️</button>
                  <button @click="submitDelete(message)" class="btn-icon small" title="Delete">🗑️</button>
                </div>
                <div class="message-content">
                  <template v-if="editingMessageId === (message.id || message._id)">
                    <div style="display:flex;gap:8px;align-items:center;">
                      <input id="edit-input-{{ message.id || message._id }}" v-model="editingContent" class="message-input" style="flex:1;padding:6px 10px;" />
                      <button type="button" class="send-btn" @click="submitEdit(message)">OK</button>
                      <button type="button" class="btn-icon" @click="cancelEdit">✖️</button>
                    </div>
                  </template>
                  <template v-else>
                    <span>{{ message.content }}</span>
                    <small v-if="message.edited" style="margin-left:8px;color:#6b7280;font-style:italic">(edited)</small>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <!-- New messages indicator (floating at bottom) -->
          <div v-if="hasNewMessages" class="new-messages-indicator">
            <button class="new-messages-btn" @click="handleClickNewMessages">
              New messages
              <span v-if="newMessagesCount > 1" class="new-messages-badge">{{ newMessagesCount }}</span>
            </button>
          </div>
          
          <!-- Typing indicator -->
          <div v-if="typingUsers.length > 0" class="typing-indicator">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{{ typingUsers.join(', ') }} {{ typingUsers.length > 1 ? 'are typing' : 'is typing' }}...</span>
          </div>
        </div>

        <!-- Placeholder when no conversation is selected -->
        <div v-else class="no-conversation-placeholder" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;">
          <div style="text-align:center;color:#64748b;">
            <p style="font-weight:600;margin-bottom:6px;">No conversation selected</p>
            <p style="font-size:13px;">Choose a user or group from the list to start a discussion.</p>
          </div>
        </div>
      </div>

      <!-- Input area: displayed only if a private conversation or group is selected -->
      <div v-if="selectedUser || selectedGroup" class="chat-footer">
        <form @submit.prevent="sendMessage" class="message-form" ref="emojiWrapper">
          <input 
            v-model="newMessage" 
            ref="messageInput"
            type="text" 
            placeholder="Type your message..."
            @input="handleTyping"
            @blur="stopTyping"
            class="message-input"
            maxlength="1000"
          />

          <div class="emoji-area">
            <button type="button" class="emoji-btn" @click.stop="toggleEmojiPicker" title="Emojis">
              😊
            </button>

            <div v-if="showEmojiPicker" class="emoji-picker" @click.stop>
              <button v-for="(e, i) in emojis" :key="i" type="button" class="emoji-item" @click="insertEmoji(e)">{{ e }}</button>
            </div>
          </div>

          <button type="submit" class="send-btn" :disabled="!newMessage.trim() || (!selectedUser && !selectedGroup)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
      
      <!-- Group Modal -->
      <GroupModal 
        :is-open="showGroupModal"
        @close="showGroupModal = false"
        @created="onGroupCreated"
      />
      
      <!-- Group Members Modal -->
      <div v-if="showMembersModal" class="modal-overlay" @click="closeMembersModal">
        <div class="modal-container members-modal" @click.stop>
          <div class="modal-header">
            <h3>Group members</h3>
            <button @click="closeMembersModal" class="btn-close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="members-list">
              <div v-for="member in groupMembers" :key="member.id" class="member-item">
                <span class="member-avatar">{{ (member.username || 'U').charAt(0).toUpperCase() }}</span>
                <span class="member-name">{{ member.username || 'User' }}</span>
                <span v-if="member.id === selectedGroup?.creator?.id || member.id === selectedGroup?.creator" class="member-badge">Creator</span>
                <span v-else-if="member.id === currentUserId" class="member-badge-me">You</span>
              </div>
            </div>
            
            <div v-if="!isGroupCreator" class="leave-group-section">
              <button @click="leaveGroup" class="btn-leave-group">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Leave group</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

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

.new-messages-divider {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}
.new-messages-divider .divider-text {
  background: #ffffff;
  color: #475569;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
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
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-icon.btn-delete {
  background: rgba(239, 68, 68, 0.2);
}

.btn-icon.btn-delete:hover {
  background: rgba(239, 68, 68, 0.3);
}

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.user-list {
  width: 220px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.search-bar {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  background: white;
}

.search-input:focus {
  border-color: #667eea;
}

.search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.clear-search-btn {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.clear-search-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.user-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.user-section {
  padding: 8px;
  margin-bottom: 4px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 11px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  padding: 0 4px;
}

.search-loading,
.no-results,
.empty-state,
.search-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
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

.user-avatar.group-avatar {
  background: #f59e0b;
}

.create-group-section {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.btn-create-group {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-create-group:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.user-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name.unread {
  font-weight: 700;
  color: #0f172a; /* darker */
}

.user-unread-badge {
  min-width: 18px;
  height: 18px;
  background: #ef4444;
  color: white;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  padding: 0 6px;
  margin-left: 8px;
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

.message {
  position: relative;
  padding-top: 20px; /* donner de la place pour les boutons d'action en haut */
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

.message-actions {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.btn-icon.small {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Styles to make buttons readable on colored backgrounds */
.message-actions .btn-icon.small {
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(15,23,42,0.06);
  border-radius: 6px;
  color: #0f172a;
  box-shadow: 0 4px 10px rgba(2,6,23,0.12);
}

.message .message-content {
  /* ensure content is not covered by action buttons */
  position: relative;
  z-index: 1;
}

/* Responsive */
@media (max-width: 480px) {
  .message {
    padding-top: 12px;
  }
  .message-actions {
    top: 4px;
    right: 6px;
  }
  .message-actions .btn-icon.small {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #64748b;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
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

.emoji-area {
  position: relative;
  display: flex;
  align-items: center;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.emoji-picker {
  position: absolute;
  bottom: 48px;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  display: grid;
  grid-template-columns: repeat(5, 28px);
  gap: 6px;
  z-index: 50;
}

.emoji-item {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  line-height: 1;
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
    width: 180px;
  }
  
  .search-input {
    font-size: 12px;
    padding: 6px 28px 6px 28px;
  }
}

@media (min-width: 481px) {
  .chat-panel {
    width: 600px;
  }
}

/* Modal Base Styles */
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
}

.btn-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* Members Modal Styles */
.members-modal {
  max-width: 450px;
  width: 90%;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.member-name {
  flex: 1;
  font-weight: 500;
  color: #1e293b;
}

.member-badge {
  padding: 4px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.member-badge-me {
  padding: 4px 8px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.leave-group-section {
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.btn-leave-group {
  width: 100%;
  padding: 12px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-leave-group:hover {
  background: #fecaca;
  border-color: #f87171;
}

.btn-leave-group svg {
  flex-shrink: 0;
}
</style>
