const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { getConnectedUsersArray, getIO } = require('../socket');

// show messages from a specific room
router.get('/messages/:room', auth, async (req, res) => {
  try {
    const { room } = req.params;
    // Disable access to general chat
    if (room === 'general') {
      return res.status(403).json({ success: false, error: 'General chat is disabled' });
    }
    const { limit = 50, before } = req.query;

    const query = { room, deleted: { $ne: true } };
    
    // Cursor-based pagination
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Reverse to have messages in chronological order
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
        edited: msg.edited || false,
        editedAt: msg.editedAt || null,
        deleted: msg.deleted || false,
        deletedAt: msg.deletedAt || null,
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

// Retrieve private messages between two users
router.get('/private/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;
    // req.userId is set by the auth middleware and contains the ObjectId
    const currentUserIdObj = req.userId;
    const currentUserId = currentUserIdObj.toString();

    // Create the room ID for the private conversation (use strings)
    const roomId = [currentUserId, userId].sort().join('-');

    const query = { room: roomId, deleted: { $ne: true } };
    
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
        edited: msg.edited || false,
        editedAt: msg.editedAt || null,
        deleted: msg.deleted || false,
        deletedAt: msg.deletedAt || null,
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

// Retrieve group messages
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;
    
    // Verify that the user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    if (!group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }
    
    const query = { group: groupId, deleted: { $ne: true } };
    
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
        group: msg.group,
        room: msg.room,
        edited: msg.edited || false,
        editedAt: msg.editedAt || null,
        deleted: msg.deleted || false,
        deletedAt: msg.deletedAt || null,
        createdAt: msg.createdAt,
        isGroup: true
      }))
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group messages'
    });
  }
});

// get online users
router.get('/users/online', auth, async (req, res) => {
  try {
    const users = getConnectedUsersArray();
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

// Retrieve recent conversations of the user
router.get('/conversations', auth, async (req, res) => {
  try {
    // Use req.userId (ObjectId) for MongoDB queries
    const currentUserId = req.userId;

    // Find the latest private messages where the user is involved
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

// endpoint to edit a message (only sender can edit)
router.put('/messages/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });

    // Verify that the sender is the one editing
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this message' });
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    const messageData = {
      id: message._id,
      sender: message.sender.toString(),
      senderUsername: message.senderUsername,
      recipient: message.recipient ? message.recipient.toString() : null,
      content: message.content,
      room: message.room,
      createdAt: message.createdAt,
      edited: message.edited,
      editedAt: message.editedAt,
      isPrivate: !!message.recipient
    };

    try {
      // Emit the update event to members of the private room
      const io = getIO();
      if (message.room) {
        io.to(message.room).emit('message:private:updated', messageData);
      } else {
        // fallback: emit to recipient and sender
        io.emit('message:private:updated', messageData);
      }
    } catch (emitErr) {
      console.error('Failed to emit message update:', emitErr);
    }

    res.json({ success: true, data: messageData });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

// endpoint to delete (soft-delete) a message (only sender can delete)
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });

    // Verify that the sender is the one deleting
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message' });
    }

    // Hard delete: remove from DB
    await Message.findByIdAndDelete(id);

    const messageData = {
      id: id,
      sender: message.sender.toString(),
      senderUsername: message.senderUsername,
      recipient: message.recipient ? message.recipient.toString() : null,
      room: message.room,
      createdAt: message.createdAt,
      isPrivate: !!message.recipient
    };

    try {
      const io = getIO();
      if (message.room) {
        io.to(message.room).emit('message:private:deleted', messageData);
      } else {
        io.emit('message:private:deleted', messageData);
      }
    } catch (emitErr) {
      console.error('Failed to emit message deletion:', emitErr);
    }

    res.json({ success: true, data: messageData });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});
