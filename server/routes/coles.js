const express = require('express');
const { searchColes } = require('../sources/coles');

const router = express.Router();

router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const allProducts = await searchColes(q.trim());
    const products = allProducts.filter((p) => p.price != null);
    res.json({ query: q, count: products.length, products });
  } catch (err) {
    console.error('Coles search error:', err.message);
    res.status(500).json({ error: 'Failed to search Coles. Please try again.' });
  }
});

module.exports = router;
