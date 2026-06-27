const axios = require('axios');
const cheerio = require('cheerio');
const { priceSelectors, titleSelectors, parsePrice } = require('./sites/generic');

async function scrapePrice(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);

  let price = null;
  for (const selector of priceSelectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.attr('content') || el.text();
      price = parsePrice(text);
      if (price && price > 0) break;
    }
  }

  let productName = null;
  for (const selector of titleSelectors) {
    const el = $(selector).first();
    if (el.length) {
      productName = el.text().trim();
      if (productName) break;
    }
  }

  return {
    price,
    productName: productName || 'Unknown Product',
    url,
  };
}

module.exports = { scrapePrice };
