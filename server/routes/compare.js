const express = require('express');
const { searchAll, ALL_RETAILERS, RETAILER_LABELS } = require('../sources/search-all');

const router = express.Router();

router.get('/search', async (req, res) => {
  const { q, retailers } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const retailerList = retailers
    ? retailers.split(',').filter((r) => ALL_RETAILERS.includes(r))
    : ALL_RETAILERS;

  try {
    const results = await searchAll(q.trim(), retailerList);
    res.json({ query: q, retailers: results });
  } catch (err) {
    console.error('Compare search error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

router.get('/retailers', (req, res) => {
  res.json(RETAILER_LABELS);
});

module.exports = router;
