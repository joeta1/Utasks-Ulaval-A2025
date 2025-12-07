const express = require('express');
const Group = require('../models/Group');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/groups - Create a new group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required'
      });
    }
    
    // Create the group with the creator as the first member
    const members = [req.userId];
    
    // Add other members (if provided)
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach(id => {
        if (id !== req.userId && !members.includes(id)) {
          members.push(id);
        }
      });
    }
    
    const group = new Group({
      name: name.trim(),
      creator: req.userId,
      members
    });
    
    await group.save();
    
    // Populate member information
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Emit a socket event to notify added members (except the creator)
    if (members.length > 1) {
      const io = require('../socket').getIO();
      const connectedUsers = require('../socket').getConnectedUsers();
      
      console.log('[Groups] Notifying members:', members);
      console.log('[Groups] Connected users:', Array.from(connectedUsers.keys()));
      
      members.forEach(memberId => {
        if (memberId !== req.userId) {
          // Get the user's socket connection
          const userConnection = connectedUsers.get(memberId);
          console.log(`[Groups] Member ${memberId}: connection =`, userConnection);
          
          if (userConnection) {
            // Emit directly to this user's socket
            console.log(`[Groups] Emitting to socket ${userConnection.socketId}`);
            io.to(userConnection.socketId).emit('group:member:added', {
              groupId: group._id.toString(),
              group: group.toJSON(),
              userId: memberId
            });
          } else {
            console.log(`[Groups] Member ${memberId} is not connected`);
          }
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating group',
      message: error.message
    });
  }
});

// GET /api/groups - List all groups the user is a member of
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.userId })
      .populate('members', 'username')
      .populate('creator', 'username')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: groups.map(g => g.toJSON())
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching groups',
      message: error.message
    });
  }
});

// GET /api/groups/:id - Get group details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    // Verify that the user is a member (before populate)
    if (!group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }
    
    // Populate after verification
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching group',
      message: error.message
    });
  }
});

// PUT /api/groups/:id - Update a group
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    // Only the creator can update the group
    if (group.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can update the group'
      });
    }
    
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    group.updatedAt = new Date();
    
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating group',
      message: error.message
    });
  }
});

// POST /api/groups/:id/members - Add members to a group
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User list required'
      });
    }
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    // Verify that the user is a member
    if (!group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member to add users'
      });
    }
    
    // Add new members
    const newMembers = [];
    userIds.forEach(userId => {
      if (!group.isMember(userId)) {
        group.addMember(userId);
        newMembers.push(userId);
      }
    });
    
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Emit a socket event to notify new members
    if (newMembers.length > 0) {
      const io = require('../socket').getIO();
      newMembers.forEach(memberId => {
        io.emit('group:member:added', {
          groupId: group._id.toString(),
          group: group.toJSON(),
          userId: memberId
        });
      });
    }
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({
      success: false,
      error: 'Error adding members',
      message: error.message
    });
  }
});

// DELETE /api/groups/:id/members/:userId - Remove a member from a group
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    const userToRemove = req.params.userId;
    const currentUserId = req.userId.toString();
    
    // Either the creator removes someone, or the user removes themselves
    if (group.creator.toString() !== currentUserId && userToRemove !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized'
      });
    }
    
    // Do not allow removing the creator
    if (userToRemove === group.creator.toString()) {
      return res.status(400).json({
        success: false,
        error: 'The creator cannot leave the group'
      });
    }
    
    group.removeMember(userToRemove);
    await group.save();
    await group.populate('members', 'username');
    await group.populate('creator', 'username');
    
    // Emit a socket event to notify that the user has left
    const io = require('../socket').getIO();
    io.emit('group:member:removed', {
      groupId: group._id.toString(),
      userId: userToRemove,
      group: group.toJSON()
    });
    
    res.json({
      success: true,
      data: group.toJSON()
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Error removing member',
      message: error.message
    });
  }
});

// DELETE /api/groups/:id - Delete a group
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }
    
    // Only the creator can delete the group
    if (group.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can delete the group'
      });
    }
    
    const groupId = group._id.toString();
    const members = [...group.members];
    
    await Group.findByIdAndDelete(req.params.id);
    
    // Emit a socket event to notify all members
    const io = require('../socket').getIO();
    members.forEach(memberId => {
      io.emit('group:deleted', {
        groupId: groupId,
        userId: memberId.toString()
      });
    });
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting group',
      message: error.message
    });
  }
});

module.exports = router;
