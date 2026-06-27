const axios = require('axios');
const cheerio = require('cheerio');

async function searchColes(query) {
  const response = await axios.get('https://www.coles.com.au/search/products', {
    params: { q: query },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const nextDataRaw = $('#__NEXT_DATA__').html();

  if (!nextDataRaw) {
    console.log('No __NEXT_DATA__ found on Coles page');
    return [];
  }

  const nextData = JSON.parse(nextDataRaw);
  const results = nextData?.props?.pageProps?.searchResults?.results || [];

  return results.map((item) => {
    const pricing = item.pricing || {};
    const wasPrice = pricing.was && pricing.was > 0 ? pricing.was : null;

    return {
      name: item.name || '',
      brand: item.brand || '',
      description: item.description || '',
      size: item.size || '',
      price: pricing.now || null,
      wasPrice,
      saveAmount: pricing.saveAmount || null,
      savePercent: pricing.savePercent || null,
      saveStatement: pricing.saveStatement || null,
      priceDescription: pricing.priceDescription || null,
      promotionType: pricing.promotionType || null,
      offerDescription: pricing.offerDescription || null,
      unitPrice: pricing.comparable || null,
      isOnSpecial: !!(wasPrice && wasPrice > pricing.now),
      isMultiBuy: pricing.specialType === 'MULTI_SAVE',
      imageUrl: item.imageUris?.[0]
        ? `https://productimages.coles.com.au/productimages${item.imageUris[0].uri}`
        : null,
      link: `https://www.coles.com.au/product/${item.id}`,
    };
  });
}

module.exports = { searchColes };
