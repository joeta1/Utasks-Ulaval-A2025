const express = require('express');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');

const router = express.Router();

// POST /api/boards - Create a new board
router.post('/', async (req, res) => {
  try {
    const { name, userId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Board name is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const board = new Board({
      name,
      userId
    });

    await board.save();

    res.status(201).json({
      success: true,
      data: board.toJSON()
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating board',
      errors: [{ message: error.message }]
    });
  }
});

// GET /api/boards/:id - Get board by ID
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found'
      });
    }

    res.json({
      success: true,
      data: board.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching board',
      message: error.message
    });
  }
});

// PUT /api/boards/:id - Update board by ID
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Board name is required'
      });
    }

    const board = await Board.findByIdAndUpdate(
      req.params.id,
      { name, updatedAt: new Date() },
      { new: true }
    );
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found'
      });
    }

    res.json({
      success: true,
      data: board.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating board',
      message: error.message
    });
  }
});

// DELETE /api/boards/:id - Delete board by ID
router.delete('/:id', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found'
      });
    }

    // Delete all lists and cards associated with this board
    const lists = await List.find({ boardId: req.params.id });
    for (const list of lists) {
      await Card.deleteMany({ listId: list._id });
    }
    await List.deleteMany({ boardId: req.params.id });
    await Board.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting board',
      message: error.message
    });
  }
});

// GET /api/boards/user/:userId - Get boards by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const boards = await Board.find({ userId: req.params.userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: boards.map(board => board.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching boards',
      message: error.message
    });
  }
});

module.exports = router;
