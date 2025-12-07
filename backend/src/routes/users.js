const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/users/register - Register a new user (legacy endpoint for compatibility)
router.post('/register', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ username });
    
    if (user) {
      // Return existing user for compatibility with livrable 1
      return res.json({
        success: true,
        data: user.toJSON()
      });
    }

    // Create new user with default password for legacy support
    user = new User({
      username,
      password: 'default123' // Default password for legacy users
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating user',
      errors: [{ message: error.message }]
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching user',
      message: error.message
    });
  }
});

// GET /api/users - Get list of all users (auth required)
// Supports search via ?query=... parameter
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    let filter = {};
    
    // If search query is provided, filter users by username
    if (query && query.trim()) {
      filter.username = { $regex: query.trim(), $options: 'i' };
    }
    
    const users = await User.find(filter, { username: 1 }).sort({ username: 1 }).lean();
    res.json({
      success: true,
      data: users.map(u => ({ id: u._id.toString(), username: u.username }))
    });
  } catch (error) {
    console.error('Error fetching users list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// DELETE /api/users/:id - Delete user by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Only allow users to delete their own account
    if (req.userId.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this user'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting user',
      message: error.message
    });
  }
});

module.exports = router;
