import { ref, computed } from 'vue'

// Reactive authentication state — keeps in sync with localStorage
const token = ref(localStorage.getItem('token') || null)
const currentUser = ref({
  id: localStorage.getItem('userId') || null,
  username: localStorage.getItem('userName') || ''
})

const isAuthenticated = computed(() => {
  return !!token.value || !!currentUser.value?.id
})

function setAuth({ token: newToken = null, id = null, username = '' } = {}) {
  token.value = newToken
  currentUser.value = { id, username }

  if (newToken) localStorage.setItem('token', newToken)
  else localStorage.removeItem('token')

  if (id) localStorage.setItem('userId', id)
  else localStorage.removeItem('userId')

  if (username) localStorage.setItem('userName', username)
  else localStorage.removeItem('userName')
}

function clearAuth() {
  setAuth({ token: null, id: null, username: '' })
}

function initAuthFromStorage() {
  token.value = localStorage.getItem('token') || null
  currentUser.value = {
    id: localStorage.getItem('userId') || null,
    username: localStorage.getItem('userName') || ''
  }
}

export default {
  token,
  currentUser,
  isAuthenticated,
  setAuth,
  clearAuth,
  initAuthFromStorage
}
