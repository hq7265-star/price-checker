const { getDb, saveDb } = require('../config/db');
const { sendDealAlert } = require('../services/emailService');

async function matchAndNotify() {
  const db = await getDb();

  const settingsResult = db.exec("SELECT notification_email FROM settings WHERE id = 1");
  if (!settingsResult.length || !settingsResult[0].values[0][0]) {
    console.log('No notification email configured, skipping matching');
    return;
  }
  const email = settingsResult[0].values[0][0];

  const watchlistResult = db.exec("SELECT * FROM watchlist WHERE is_active = 1");
  if (!watchlistResult.length) return;

  const watchlistColumns = watchlistResult[0].columns;
  const watchlistItems = watchlistResult[0].values.map(row => {
    const obj = {};
    watchlistColumns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

  const matchedDeals = [];

  for (const item of watchlistItems) {
    const dealsResult = db.exec(
      "SELECT * FROM deals WHERE title LIKE ? ORDER BY published_at DESC LIMIT 20",
      [`%${item.keyword}%`]
    );
    if (!dealsResult.length) continue;

    const dealColumns = dealsResult[0].columns;
    const deals = dealsResult[0].values.map(row => {
      const obj = {};
      dealColumns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    for (const deal of deals) {
      if (item.target_price && deal.price && deal.price > item.target_price) {
        continue;
      }

      const alreadyNotified = db.exec(
        "SELECT id FROM notifications_log WHERE watchlist_id = ? AND deal_id = ?",
        [item.id, deal.id]
      );
      if (alreadyNotified.length > 0 && alreadyNotified[0].values.length > 0) {
        continue;
      }

      matchedDeals.push({
        watchlist_id: item.id,
        deal_id: deal.id,
        keyword: item.keyword,
        title: deal.title,
        link: deal.link,
        price: deal.price,
      });
    }
  }

  if (matchedDeals.length === 0) {
    console.log('No new matching deals found');
    return;
  }

  try {
    await sendDealAlert(email, matchedDeals);

    for (const match of matchedDeals) {
      db.run(
        "INSERT INTO notifications_log (watchlist_id, deal_id) VALUES (?, ?)",
        [match.watchlist_id, match.deal_id]
      );
    }
    saveDb();

    console.log(`Matched and notified ${matchedDeals.length} deals`);
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}

module.exports = { matchAndNotify };
