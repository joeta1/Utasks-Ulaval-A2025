const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');

let io;

// Map pour stocker les utilisateurs connectés
const connectedUsers = new Map();

function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware d'authentification pour Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);
    
    // Ajouter l'utilisateur à la liste des connectés
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      userId: socket.userId
    });

    // Rejoindre la room générale
    socket.join('general');

    // Notifier tous les utilisateurs de la nouvelle connexion
    io.emit('user:connected', {
      userId: socket.userId,
      username: socket.username,
      connectedUsers: Array.from(connectedUsers.values())
    });

    // Envoyer la liste des utilisateurs connectés au nouvel arrivant
    socket.emit('users:online', Array.from(connectedUsers.values()));

    // Gestion des messages dans le chat général
    socket.on('message:send', async (data) => {
      try {
        const { content, room = 'general' } = data;
        
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        const message = new Message({
          sender: socket.userId,
          senderUsername: socket.username,
          content: content.trim(),
          room: room
        });

        await message.save();

        const messageData = {
          id: message._id,
          sender: socket.userId,
          senderUsername: socket.username,
          content: message.content,
          room: message.room,
          createdAt: message.createdAt
        };

        // Envoyer le message à tous les utilisateurs dans la room
        io.to(room).emit('message:received', messageData);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Gestion des messages privés
    socket.on('message:private', async (data) => {
      try {
        const { content, recipientId } = data;
        
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        if (!recipientId) {
          return socket.emit('error', { message: 'Recipient is required' });
        }

        // Créer un ID de room unique pour la conversation privée
        const roomId = [socket.userId, recipientId].sort().join('-');

        const message = new Message({
          sender: socket.userId,
          senderUsername: socket.username,
          recipient: recipientId,
          content: content.trim(),
          room: roomId
        });

        await message.save();

        const messageData = {
          id: message._id,
          sender: socket.userId,
          senderUsername: socket.username,
          recipient: recipientId,
          content: message.content,
          room: roomId,
          createdAt: message.createdAt,
          isPrivate: true
        };

        // Envoyer le message à l'expéditeur
        socket.emit('message:private:received', messageData);

        // Envoyer le message au destinataire s'il est connecté
        const recipientSocket = connectedUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('message:private:received', messageData);
        }
      } catch (error) {
        console.error('Error sending private message:', error);
        socket.emit('error', { message: 'Failed to send private message' });
      }
    });

    // Indicateur de frappe
    socket.on('typing:start', (data) => {
      const { room = 'general' } = data;
      socket.to(room).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        isTyping: true
      });
    });

    socket.on('typing:stop', (data) => {
      const { room = 'general' } = data;
      socket.to(room).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        isTyping: false
      });
    });

    // Rejoindre une room spécifique (pour les messages privés)
    socket.on('room:join', (roomId) => {
      socket.join(roomId);
    });

    // Quitter une room
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
      
      connectedUsers.delete(socket.userId);
      
      io.emit('user:disconnected', {
        userId: socket.userId,
        username: socket.username,
        connectedUsers: Array.from(connectedUsers.values())
      });
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

module.exports = { initializeSocket, getIO, getConnectedUsers };
