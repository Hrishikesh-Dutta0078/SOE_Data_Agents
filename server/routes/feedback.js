const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const feedbackStore = []; // In-memory for now; replace with DB later

router.post('/', (req, res) => {
  const { sessionId, question, sql, rating, comment } = req.body;
  if (!rating || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be "up" or "down"' });
  }
  const entry = { sessionId, question, sql, rating, comment: comment || '', timestamp: Date.now() };
  feedbackStore.push(entry);
  logger.info('User feedback recorded', { rating, question: (question || '').substring(0, 100) });
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const up = feedbackStore.filter(f => f.rating === 'up').length;
  const down = feedbackStore.filter(f => f.rating === 'down').length;
  res.json({ total: feedbackStore.length, up, down });
});

module.exports = router;
