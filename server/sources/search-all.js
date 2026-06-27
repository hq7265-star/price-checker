const { execFile } = require('child_process');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'retailer-worker.js');

const ALL_RETAILERS = ['coles', 'woolworths', 'chemistwarehouse', 'priceline', 'myer', 'davidjones'];

const RETAILER_LABELS = {
  coles: 'Coles',
  woolworths: 'Woolworths',
  chemistwarehouse: 'Chemist Warehouse',
  priceline: 'Priceline',
  myer: 'Myer',
  davidjones: 'David Jones',
};

function searchRetailer(retailer, query) {
  return new Promise((resolve) => {
    execFile(
      'node',
      [WORKER_PATH, retailer, query],
      { timeout: 60000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error(`${retailer} worker error:`, stderr?.trim() || err.message);
          return resolve({ retailer, label: RETAILER_LABELS[retailer], products: [], error: err.message });
        }
        try {
          const products = JSON.parse(stdout.trim());
          const filtered = filterRelevant(products, query);
          resolve({ retailer, label: RETAILER_LABELS[retailer], products: filtered });
        } catch (parseErr) {
          console.error(`${retailer} parse error:`, parseErr.message);
          resolve({ retailer, label: RETAILER_LABELS[retailer], products: [], error: parseErr.message });
        }
      }
    );
  });
}

async function searchAll(query, retailers = ALL_RETAILERS) {
  // Run in batches of 3 to avoid overwhelming the system with Chrome instances
  const results = [];
  for (let i = 0; i < retailers.length; i += 3) {
    const batch = retailers.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map((r) => searchRetailer(r, query))
    );
    results.push(...batchResults);
  }

  // Find the cheapest across all retailers
  let cheapestPrice = Infinity;
  for (const r of results) {
    for (const p of r.products) {
      if (p.price && p.price < cheapestPrice) {
        cheapestPrice = p.price;
      }
    }
  }

  // Mark the cheapest product(s)
  for (const r of results) {
    for (const p of r.products) {
      p.isCheapest = p.price === cheapestPrice && cheapestPrice < Infinity;
    }
  }

  return results;
}

function filterRelevant(products, query) {
  if (!products.length) return [];

  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length) return products.filter((p) => p.price != null).slice(0, 5);

  // Short queries (1-3 words): require ALL words to match
  // Longer queries (4+ words): require at least 60% of words
  const minRatio = words.length <= 3 ? 1.0 : 0.6;

  const scored = products
    .filter((p) => p.price != null)
    .map((p) => {
      const text = `${p.name} ${p.brand} ${p.description || ''}`.toLowerCase();
      const matches = words.filter((w) => text.includes(w));
      return { ...p, relevance: matches.length / words.length };
    })
    .filter((p) => p.relevance >= minRatio)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);

  return scored.map(({ relevance, ...rest }) => rest);
}

module.exports = { searchAll, searchRetailer, ALL_RETAILERS, RETAILER_LABELS };
