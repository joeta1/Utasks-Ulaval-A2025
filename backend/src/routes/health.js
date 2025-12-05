const express = require('express');
const router = express.Router();

// GET / - Welcome endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to UTasks API',
    version: '1.0.0'
  });
});

// GET /api/health - Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
