const express = require('express');
const { getDb } = require('../config/db');
const { fetchOzBargainDeals } = require('../sources/ozbargain');

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const { category, limit = 50 } = req.query;

  let sql = "SELECT * FROM deals";
  const params = [];

  if (category && category !== 'all') {
    sql += " WHERE category = ?";
    params.push(category);
  }

  sql += " ORDER BY published_at DESC LIMIT ?";
  params.push(parseInt(limit));

  const result = db.exec(sql, params);
  const deals = resultToObjects(result);
  res.json(deals);
});

router.get('/search', async (req, res) => {
  const db = await getDb();
  const { q } = req.query;

  if (!q) return res.json([]);

  const result = db.exec(
    "SELECT * FROM deals WHERE title LIKE ? ORDER BY published_at DESC LIMIT 50",
    [`%${q}%`]
  );
  res.json(resultToObjects(result));
});

router.post('/fetch-now', async (req, res) => {
  try {
    const newDeals = await fetchOzBargainDeals();
    res.json({ message: `Fetched ${newDeals.length} new deals`, count: newDeals.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deals: ' + err.message });
  }
});

function resultToObjects(result) {
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

module.exports = router;
