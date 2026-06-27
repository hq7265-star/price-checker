const priceSelectors = [
  '[data-price]',
  '.a-price .a-offscreen',
  '.a-price-whole',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '.price-current',
  '.product-price',
  '.sale-price',
  '.current-price',
  '.price',
  '[class*="price"]',
  '[class*="Price"]',
  '[itemprop="price"]',
];

const titleSelectors = [
  '#productTitle',
  'h1[class*="product"]',
  'h1[class*="title"]',
  '[itemprop="name"]',
  'h1',
];

function parsePrice(text) {
  const match = text.match(/[\d,]+\.?\d*/);
  if (!match) return null;
  return parseFloat(match[0].replace(/,/g, ''));
}

module.exports = { priceSelectors, titleSelectors, parsePrice };
