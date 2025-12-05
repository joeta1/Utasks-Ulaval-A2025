// API Service for UTasks
// Centralized API calls with authentication support

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Get auth token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set auth token to localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove auth token from localStorage
function removeToken() {
  localStorage.removeItem('token');
}

// Get headers with auth token
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8'
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Generic fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  };
  
  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// Auth API
export const authApi = {
  async register(username, password, email = null) {
    const body = { username, password };
    if (email) body.email = email;
    
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    if (data.success && data.data.token) {
      setToken(data.data.token);
      localStorage.setItem('userId', data.data.user.id);
      localStorage.setItem('userName', data.data.user.username);
    }
    
    return data;
  },
  
  async login(username, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (data.success && data.data.token) {
      setToken(data.data.token);
      localStorage.setItem('userId', data.data.user.id);
      localStorage.setItem('userName', data.data.user.username);
    }
    
    return data;
  },
  
  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (_e) {
      // Ignore errors on logout
    }
    removeToken();
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  },
  
  async getCurrentUser() {
    return apiFetch('/api/auth/me');
  },
  
  isAuthenticated() {
    return !!getToken();
  },
  
  getUser() {
    return {
      id: localStorage.getItem('userId'),
      username: localStorage.getItem('userName')
    };
  }
};

// Users API (legacy support)
export const usersApi = {
  async register(username) {
    const data = await apiFetch('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    
    if (data.success) {
      localStorage.setItem('userId', data.data.id);
      localStorage.setItem('userName', data.data.username);
    }
    
    return data;
  },
  
  async getById(id) {
    return apiFetch(`/api/users/${id}`);
  },
  
  async delete(id) {
    return apiFetch(`/api/users/${id}`, { method: 'DELETE' });
  }
};

// Boards API
export const boardsApi = {
  async create(name, userId) {
    return apiFetch('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name, userId })
    });
  },
  
  async getById(id) {
    return apiFetch(`/api/boards/${id}`);
  },
  
  async update(id, name) {
    return apiFetch(`/api/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  },
  
  async delete(id) {
    return apiFetch(`/api/boards/${id}`, { method: 'DELETE' });
  },
  
  async getByUserId(userId) {
    return apiFetch(`/api/boards/user/${userId}`);
  }
};

// Lists API
export const listsApi = {
  async create(name, boardId, position = undefined) {
    const body = { name, boardId };
    if (position !== undefined) body.position = position;
    
    return apiFetch('/api/lists', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  async getById(id) {
    return apiFetch(`/api/lists/${id}`);
  },
  
  async update(id, data) {
    return apiFetch(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  async delete(id) {
    return apiFetch(`/api/lists/${id}`, { method: 'DELETE' });
  },
  
  async getByBoardId(boardId) {
    return apiFetch(`/api/lists/board/${boardId}`);
  }
};

// Cards API
export const cardsApi = {
  async create(title, listId, description = '', position = undefined) {
    const body = { title, listId, description };
    if (position !== undefined) body.position = position;
    
    return apiFetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  async getById(id) {
    return apiFetch(`/api/cards/${id}`);
  },
  
  async update(id, data) {
    return apiFetch(`/api/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  async delete(id) {
    return apiFetch(`/api/cards/${id}`, { method: 'DELETE' });
  },
  
  async getByListId(listId) {
    return apiFetch(`/api/cards/list/${listId}`);
  }
};

export default {
  auth: authApi,
  users: usersApi,
  boards: boardsApi,
  lists: listsApi,
  cards: cardsApi
};
