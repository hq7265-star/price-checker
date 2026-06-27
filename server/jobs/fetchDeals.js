const { fetchOzBargainDeals } = require('../sources/ozbargain');
const { matchAndNotify } = require('./matchPrices');

async function runFetchJob() {
  console.log(`[${new Date().toISOString()}] Fetching deals...`);
  try {
    const newDeals = await fetchOzBargainDeals();
    if (newDeals.length > 0) {
      await matchAndNotify();
    }
  } catch (err) {
    console.error('Fetch job failed:', err.message);
  }
}

module.exports = { runFetchJob };
