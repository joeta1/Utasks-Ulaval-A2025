const express = require('express');
const List = require('../models/List');
const Card = require('../models/Card');

const router = express.Router();

// POST /api/lists - Create a new list
router.post('/', async (req, res) => {
  try {
    const { name, boardId, position } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'List name is required'
      });
    }

    if (!boardId) {
      return res.status(400).json({
        success: false,
        error: 'Board ID is required'
      });
    }

    // Get the highest position if not provided
    let listPosition = position;
    if (listPosition === undefined) {
      const lastList = await List.findOne({ boardId }).sort({ position: -1 });
      listPosition = lastList ? lastList.position + 1 : 0;
    }

    const list = new List({
      name,
      boardId,
      position: listPosition
    });

    await list.save();

    res.status(201).json({
      success: true,
      data: list.toJSON()
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating list',
      errors: [{ message: error.message }]
    });
  }
});

// GET /api/lists/:id - Get list by ID
router.get('/:id', async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    
    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    res.json({
      success: true,
      data: list.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching list',
      message: error.message
    });
  }
});

// PUT /api/lists/:id - Update list by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, position } = req.body;
    const updateData = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (position !== undefined) updateData.position = position;

    const list = await List.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    res.json({
      success: true,
      data: list.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating list',
      message: error.message
    });
  }
});

// DELETE /api/lists/:id - Delete list by ID
router.delete('/:id', async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    
    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    // Delete all cards in this list
    await Card.deleteMany({ listId: req.params.id });
    await List.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting list',
      message: error.message
    });
  }
});

// GET /api/lists/board/:boardId - Get lists by board ID
router.get('/board/:boardId', async (req, res) => {
  try {
    const lists = await List.find({ boardId: req.params.boardId }).sort({ position: 1 });

    res.json({
      success: true,
      data: lists.map(list => list.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching lists',
      message: error.message
    });
  }
});

module.exports = router;
