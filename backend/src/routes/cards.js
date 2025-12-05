const express = require('express');
const Card = require('../models/Card');

const router = express.Router();

// POST /api/cards - Create a new card
router.post('/', async (req, res) => {
  try {
    const { title, description, listId, position, dueDate, labels } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Card title is required'
      });
    }

    if (!listId) {
      return res.status(400).json({
        success: false,
        error: 'List ID is required'
      });
    }

    // Get the highest position if not provided
    let cardPosition = position;
    if (cardPosition === undefined) {
      const lastCard = await Card.findOne({ listId }).sort({ position: -1 });
      cardPosition = lastCard ? lastCard.position + 1 : 0;
    }

    const card = new Card({
      title,
      description: description || '',
      listId,
      position: cardPosition,
      dueDate: dueDate || null,
      labels: labels || []
    });

    await card.save();

    res.status(201).json({
      success: true,
      data: card.toJSON()
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating card',
      errors: [{ message: error.message }]
    });
  }
});

// GET /api/cards/:id - Get card by ID
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: card.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching card',
      message: error.message
    });
  }
});

// PUT /api/cards/:id - Update card by ID
router.put('/:id', async (req, res) => {
  try {
    const { title, description, position, listId, dueDate, labels } = req.body;
    const updateData = { updatedAt: new Date() };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (position !== undefined) updateData.position = position;
    if (listId !== undefined) updateData.listId = listId;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (labels !== undefined) updateData.labels = labels;

    const card = await Card.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: card.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error updating card',
      message: error.message
    });
  }
});

// DELETE /api/cards/:id - Delete card by ID
router.delete('/:id', async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting card',
      message: error.message
    });
  }
});

// GET /api/cards/list/:listId - Get cards by list ID
router.get('/list/:listId', async (req, res) => {
  try {
    const cards = await Card.find({ listId: req.params.listId }).sort({ position: 1 });

    res.json({
      success: true,
      data: cards.map(card => card.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching cards',
      message: error.message
    });
  }
});

module.exports = router;
