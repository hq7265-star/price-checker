const { getDb, saveDb } = require('../config/db');

async function initDatabase() {
  const db = await getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT UNIQUE NOT NULL,
      price REAL,
      original_price REAL,
      category TEXT,
      image_url TEXT,
      published_at TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      target_price REAL,
      category TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watchlist_id INTEGER NOT NULL,
      deal_id INTEGER NOT NULL,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (watchlist_id) REFERENCES watchlist(id),
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_email TEXT
    )
  `);

  const row = db.exec("SELECT COUNT(*) as count FROM settings");
  const count = row[0]?.values[0][0] || 0;
  if (count === 0) {
    db.run("INSERT INTO settings (notification_email) VALUES (NULL)");
  }

  saveDb();
  console.log('Database initialized');
}

module.exports = { initDatabase };
