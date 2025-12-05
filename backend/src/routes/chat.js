const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const { getConnectedUsers } = require('../socket');

// Récupérer l'historique des messages d'une room
router.get('/messages/:room', auth, async (req, res) => {
  try {
    const { room } = req.params;
    const { limit = 50, before } = req.query;

    const query = { room };
    
    // Pagination par curseur
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Inverser pour avoir les messages dans l'ordre chronologique
    messages.reverse();

    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id,
        sender: msg.sender,
        senderUsername: msg.senderUsername,
        content: msg.content,
        room: msg.room,
        recipient: msg.recipient,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// Récupérer les messages privés entre deux utilisateurs
router.get('/private/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;
    const currentUserId = req.user.userId;

    // Créer l'ID de room pour la conversation privée
    const roomId = [currentUserId, userId].sort().join('-');

    const query = { room: roomId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    messages.reverse();

    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id,
        sender: msg.sender,
        senderUsername: msg.senderUsername,
        content: msg.content,
        room: msg.room,
        recipient: msg.recipient,
        createdAt: msg.createdAt,
        isPrivate: true
      }))
    });
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch private messages'
    });
  }
});

// Récupérer la liste des utilisateurs connectés
router.get('/users/online', auth, async (req, res) => {
  try {
    const users = getConnectedUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch online users'
    });
  }
});

// Récupérer les conversations récentes de l'utilisateur
router.get('/conversations', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Trouver les derniers messages privés où l'utilisateur est impliqué
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { recipient: currentUserId }
          ],
          recipient: { $ne: null }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$room',
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      success: true,
      data: conversations.map(conv => ({
        roomId: conv._id,
        lastMessage: {
          id: conv.lastMessage._id,
          sender: conv.lastMessage.sender,
          senderUsername: conv.lastMessage.senderUsername,
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

module.exports = router;
