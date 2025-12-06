const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');
const Group = require('./models/Group');

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

    // Notifier tous les utilisateurs de la nouvelle connexion
    io.emit('user:connected', {
      userId: socket.userId,
      username: socket.username,
      connectedUsers: Array.from(connectedUsers.values())
    });

    // Envoyer la liste des utilisateurs connectés au nouvel arrivant
    socket.emit('users:online', Array.from(connectedUsers.values()));

    // NOTE: Chat général désactivé — n'accepterons que des messages privés via 'message:private'

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

    // Gestion des messages de groupe
    socket.on('message:group', async (data) => {
      try {
        const { content, groupId } = data;
        
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }
        
        if (!groupId) {
          return socket.emit('error', { message: 'Group ID is required' });
        }
        
        // Vérifier que l'utilisateur est membre du groupe
        const group = await Group.findById(groupId);
        if (!group) {
          return socket.emit('error', { message: 'Group not found' });
        }
        
        if (!group.isMember(socket.userId)) {
          return socket.emit('error', { message: 'You are not a member of this group' });
        }
        
        const message = new Message({
          sender: socket.userId,
          senderUsername: socket.username,
          group: groupId,
          content: content.trim(),
          room: `group-${groupId}`
        });
        
        await message.save();
        
        const messageData = {
          id: message._id,
          sender: socket.userId,
          senderUsername: socket.username,
          group: groupId,
          content: message.content,
          room: message.room,
          createdAt: message.createdAt,
          isGroup: true
        };
        
        // Envoyer le message à tous les membres du groupe
        io.to(`group-${groupId}`).emit('message:group:received', messageData);
      } catch (error) {
        console.error('Error sending group message:', error);
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    // Indicateur de frappe (pour rooms privées et groupes)
    socket.on('typing:start', (data) => {
      const { room } = data;
      if (!room) return;
      socket.to(room).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        room: room,
        isTyping: true
      });
    });

    socket.on('typing:stop', (data) => {
      const { room } = data;
      if (!room) return;
      socket.to(room).emit('typing:update', {
        userId: socket.userId,
        username: socket.username,
        room: room,
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
