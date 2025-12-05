// Socket.io Service for real-time chat
import { io } from 'socket.io-client';
import authStore from '../stores/auth'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connecter au serveur Socket.io
  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return this.socket;
  }

  // Déconnecter
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Vérifier si connecté
  isConnected() {
    return this.socket?.connected || false;
  }

  // NOTE: General chat disabled on server; use sendPrivateMessage instead.

  // Envoyer un message privé
  sendPrivateMessage(content, recipientId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    this.socket.emit('message:private', { content, recipientId });
    return true;
  }

  // Indicateur de frappe (exige une room explicite — conversation privée)
  startTyping(room) {
    if (!room) return;
    if (this.socket?.connected) {
      this.socket.emit('typing:start', { room });
    }
  }

  stopTyping(room) {
    if (!room) return;
    if (this.socket?.connected) {
      this.socket.emit('typing:stop', { room });
    }
  }

  // Rejoindre une room
  joinRoom(roomId) {
    if (this.socket?.connected) {
      this.socket.emit('room:join', roomId);
    }
  }

  // Quitter une room
  leaveRoom(roomId) {
    if (this.socket?.connected) {
      this.socket.emit('room:leave', roomId);
    }
  }

  // Écouter les événements
  on(event, callback) {
    if (this.socket) {
      // Supprimer les anciens listeners pour cet événement avant d'en ajouter un nouveau
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => {
          this.socket.off(event, cb);
        });
        this.listeners.set(event, []);
      }
      
      this.socket.on(event, callback);
      
      // Stocker le listener pour pouvoir le supprimer plus tard
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  // Arrêter d'écouter un événement
  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // Supprimer tous les listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
    }
  }
}

// Singleton instance
export const socketService = new SocketService();

// Chat API pour récupérer l'historique
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = authStore.token.value;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const chatApi = {
  // Récupérer les messages d'une room
  async getMessages(room = null, limit = 50, before = null) {
    if (!room) throw new Error('General chat is disabled; provide a private user id via getPrivateMessages')
    let url = `${API_BASE}/api/chat/messages/${room}?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    
    const response = await fetch(url, { headers: getHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch messages');
    }
    
    return data;
  },

  // Récupérer les messages privés
  async getPrivateMessages(userId, limit = 50, before = null) {
    let url = `${API_BASE}/api/chat/private/${userId}?limit=${limit}`;
    if (before) {
      url += `&before=${encodeURIComponent(before)}`;
    }
    
    const response = await fetch(url, { headers: getHeaders() });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch private messages');
    }
    
    return data;
  },

  // Récupérer les utilisateurs en ligne
  async getOnlineUsers() {
    const response = await fetch(`${API_BASE}/api/chat/users/online`, {
      headers: getHeaders()
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch online users');
    }
    
    return data;
  },

  // Récupérer tous les utilisateurs enregistrés
  async getAllUsers() {
    const response = await fetch(`${API_BASE}/api/users`, { headers: getHeaders() });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }

    return data;
  },

  // Récupérer les conversations récentes
  async getConversations() {
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
      headers: getHeaders()
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch conversations');
    }
    
    return data;
  }
  ,
  // Mettre à jour un message existant
  async updateMessage(messageId, content) {
    const response = await fetch(`${API_BASE}/api/chat/messages/${messageId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update message');
    }
    return data;
  }
};
