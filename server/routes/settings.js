const express = require('express');
const { getDb, saveDb } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const result = db.exec("SELECT * FROM settings WHERE id = 1");
  if (!result.length || !result[0].values.length) {
    return res.json({ notification_email: null });
  }
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  res.json(obj);
});

router.put('/', async (req, res) => {
  const db = await getDb();
  const { notification_email } = req.body;

  db.run(
    "UPDATE settings SET notification_email = ? WHERE id = 1",
    [notification_email || null]
  );
  saveDb();

  res.json({ notification_email });
});

module.exports = router;
