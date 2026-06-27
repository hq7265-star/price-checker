const express = require('express');
const { getDb, saveDb } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec("SELECT * FROM watchlist ORDER BY created_at DESC");
  res.json(resultToObjects(result));
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const { keyword, target_price, category } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  db.run(
    "INSERT INTO watchlist (keyword, target_price, category) VALUES (?, ?, ?)",
    [keyword, target_price || null, category || null]
  );
  saveDb();

  const result = db.exec("SELECT * FROM watchlist WHERE id = last_insert_rowid()");
  res.status(201).json(resultToObjects(result)[0]);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const { keyword, target_price, category, is_active } = req.body;

  db.run(
    "UPDATE watchlist SET keyword = COALESCE(?, keyword), target_price = ?, category = ?, is_active = COALESCE(?, is_active) WHERE id = ?",
    [keyword, target_price ?? null, category ?? null, is_active, req.params.id]
  );
  saveDb();

  const result = db.exec("SELECT * FROM watchlist WHERE id = ?", [req.params.id]);
  const items = resultToObjects(result);
  if (!items.length) return res.status(404).json({ error: 'Not found' });
  res.json(items[0]);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  db.run("DELETE FROM watchlist WHERE id = ?", [req.params.id]);
  saveDb();
  res.json({ message: 'Deleted' });
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
