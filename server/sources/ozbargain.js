const Parser = require('rss-parser');
const { getDb, saveDb } = require('../config/db');
const { extractPrice } = require('../services/priceNormalizer');

const parser = new Parser();

const FEEDS = [
  { url: 'https://www.ozbargain.com.au/deals/feed', category: 'all' },
  { url: 'https://www.ozbargain.com.au/cat/groceries/feed', category: 'groceries' },
  { url: 'https://www.ozbargain.com.au/cat/health-beauty/feed', category: 'health-beauty' },
];

async function fetchOzBargainDeals() {
  const db = await getDb();
  let newDeals = [];

  for (const feed of FEEDS) {
    try {
      const rss = await parser.parseURL(feed.url);

      for (const item of rss.items) {
        const { price, originalPrice } = extractPrice(item.title || '');

        const existing = db.exec(
          "SELECT id FROM deals WHERE link = ?",
          [item.link]
        );

        if (existing.length > 0 && existing[0].values.length > 0) continue;

        db.run(
          `INSERT INTO deals (source, title, description, link, price, original_price, category, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'ozbargain',
            item.title || '',
            item.contentSnippet || item.content || '',
            item.link,
            price,
            originalPrice,
            feed.category,
            item.isoDate || item.pubDate || null,
          ]
        );

        newDeals.push({
          title: item.title,
          link: item.link,
          price,
          originalPrice,
          category: feed.category,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${feed.url}:`, err.message);
    }
  }

  saveDb();
  console.log(`Fetched ${newDeals.length} new deals from OzBargain`);
  return newDeals;
}

module.exports = { fetchOzBargainDeals };
