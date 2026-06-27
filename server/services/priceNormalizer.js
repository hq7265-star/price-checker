function extractPrice(text) {
  if (!text) return { price: null, originalPrice: null };

  let price = null;
  let originalPrice = null;

  // "was $15.99" or "(RRP $15.99)"
  const wasMatch = text.match(/(?:was|rrp|originally)\s*\$\s*([\d,]+\.?\d*)/i);
  if (wasMatch) {
    originalPrice = parseNumber(wasMatch[1]);
  }

  // "50% off $20" → calculate discounted price
  const percentOffMatch = text.match(/(\d+)%\s*off\s*\$\s*([\d,]+\.?\d*)/i);
  if (percentOffMatch) {
    const percent = parseFloat(percentOffMatch[1]);
    const base = parseNumber(percentOffMatch[2]);
    if (base) {
      originalPrice = originalPrice || base;
      price = Math.round(base * (1 - percent / 100) * 100) / 100;
      return { price, originalPrice };
    }
  }

  // "2 for $10" or "3 for $12"
  const multiMatch = text.match(/(\d+)\s*for\s*\$\s*([\d,]+\.?\d*)/i);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseNumber(multiMatch[2]);
    if (qty > 0 && total) {
      price = Math.round((total / qty) * 100) / 100;
      return { price, originalPrice };
    }
  }

  // Standard "$5.99" — take the first dollar amount that isn't the "was" price
  const allPrices = [...text.matchAll(/\$\s*([\d,]+\.?\d*)/g)];
  for (const match of allPrices) {
    const val = parseNumber(match[1]);
    if (val && val !== originalPrice) {
      price = val;
      break;
    }
  }

  if (!price && allPrices.length > 0) {
    price = parseNumber(allPrices[0][1]);
  }

  return { price, originalPrice };
}

function parseNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

module.exports = { extractPrice };
