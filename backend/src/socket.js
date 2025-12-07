const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');
const Group = require('./models/Group');

let io;

// Map to track connected users: userId -> { socketId, username, userId }
const connectedUsers = new Map();

function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
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
    
    // Add the user to the list of connected users
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      userId: socket.userId
    });

    // Notify all users of the new connection
    io.emit('user:connected', {
      userId: socket.userId,
      username: socket.username,
      connectedUsers: Array.from(connectedUsers.values())
    });

    // Send the list of connected users to the newcomer
    socket.emit('users:online', Array.from(connectedUsers.values()));

    // NOTE: General chat disabled — will only accept private messages via 'message:private'

    // Private message handling
    socket.on('message:private', async (data) => {
      try {
        const { content, recipientId } = data;
        
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        if (!recipientId) {
          return socket.emit('error', { message: 'Recipient is required' });
        }

        // Create a unique room ID for the private conversation
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

        // Send the message to the sender
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

    // Group message handling
    socket.on('message:group', async (data) => {
      try {
        const { content, groupId } = data;
        
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }
        
        if (!groupId) {
          return socket.emit('error', { message: 'Group ID is required' });
        }
        
        // Verify that the user is a member of the group
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
        
        // Send the message to all group members
        io.to(`group-${groupId}`).emit('message:group:received', messageData);
      } catch (error) {
        console.error('Error sending group message:', error);
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    // Typing indicator (for private rooms and groups)
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

    // Join a specific room (for private messages)
    socket.on('room:join', (roomId) => {
      socket.join(roomId);
    });

    // Leave a room
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
    });

    // DDisconnection
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
  return connectedUsers;
}

function getConnectedUsersArray() {
  return Array.from(connectedUsers.values());
}

module.exports = { initializeSocket, getIO, getConnectedUsers, getConnectedUsersArray };
