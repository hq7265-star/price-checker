const puppeteer = require('puppeteer-core');
const axios = require('axios');

const retailer = process.argv[2];
const query = process.argv[3];

if (!retailer || !query) {
  console.log(JSON.stringify([]));
  process.exit(0);
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const RETAILER_URLS = {
  coles: (q) => `https://www.coles.com.au/search/products?q=${encodeURIComponent(q)}`,
  woolworths: (q) => `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(q)}`,
  chemistwarehouse: (q) => `https://www.chemistwarehouse.com.au/search?searchtext=${encodeURIComponent(q)}`,
  priceline: (q) => `https://www.priceline.com.au/search?q=${encodeURIComponent(q)}`,
  myer: (q) => `https://www.myer.com.au/search?query=${encodeURIComponent(q)}`,
  davidjones: (q) => `https://www.davidjones.com/search?q=${encodeURIComponent(q)}`,
};

// Priceline has a direct API — no Puppeteer needed
if (retailer === 'priceline') {
  searchPricelineApi(query).then((products) => {
    console.log(JSON.stringify(products));
    process.exit(0);
  }).catch((err) => {
    process.stderr.write(`priceline: ${err.message}\n`);
    console.log(JSON.stringify([]));
    process.exit(0);
  });
} else {
  runPuppeteer();
}

async function searchPricelineApi(q) {
  const r = await axios.get('https://api.priceline.com.au/occ/v2/priceline/products/search', {
    params: { query: q, pageSize: 20, lang: 'en', curr: 'AUD' },
    headers: {
      'Accept': 'application/json',
      'Origin': 'https://www.priceline.com.au',
      'Referer': 'https://www.priceline.com.au/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
    timeout: 15000,
  });

  return (r.data.products || []).map((p) => {
    const price = p.discountedPrice?.value || p.price?.value || null;
    const wasPrice = p.discountedPrice ? p.price?.value : null;
    return {
      retailer: 'priceline',
      name: p.name || '',
      brand: p.brandName || '',
      size: '',
      price,
      wasPrice: wasPrice && wasPrice > price ? wasPrice : null,
      saveAmount: wasPrice && wasPrice > price ? Math.round((wasPrice - price) * 100) / 100 : null,
      savePercent: wasPrice && wasPrice > price ? Math.round(((wasPrice - price) / wasPrice) * 100) : null,
      priceDescription: p.discountedPrice ? 'ON SALE' : null,
      offerDescription: null,
      unitPrice: null,
      isOnSpecial: !!p.discountedPrice,
      imageUrl: p.image_url || null,
      link: p.url || null,
    };
  });
}

async function runPuppeteer() {
  if (!RETAILER_URLS[retailer]) {
    console.log(JSON.stringify([]));
    process.exit(0);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
      window.chrome = { runtime: {} };
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Intercept API responses for structured data
    let apiProducts = null;
    page.on('response', async (resp) => {
      const url = resp.url();
      try {
        if (retailer === 'woolworths' && url.includes('/apis/ui/Search/products')) {
          const data = JSON.parse(await resp.text());
          apiProducts = extractWoolworthsApi(data);
        }
      } catch {}
    });

    await page.goto(RETAILER_URLS[retailer](query), { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    let products = [];

    if (retailer === 'coles') {
      products = await extractColesNextData(page);
    } else if (retailer === 'woolworths') {
      products = apiProducts || await extractGenericDOM(page, retailer, 'https://www.woolworths.com.au');
    } else {
      products = await extractGenericDOM(page, retailer, getBaseUrl(retailer));
    }

    console.log(JSON.stringify(products.filter(p => p.price != null)));
  } catch (err) {
    process.stderr.write(`${retailer}: ${err.message}\n`);
    console.log(JSON.stringify([]));
  } finally {
    if (browser) await browser.close();
  }
}

function getBaseUrl(retailer) {
  const bases = {
    coles: 'https://www.coles.com.au',
    woolworths: 'https://www.woolworths.com.au',
    chemistwarehouse: 'https://www.chemistwarehouse.com.au',
    priceline: 'https://www.priceline.com.au',
    myer: 'https://www.myer.com.au',
    davidjones: 'https://www.davidjones.com',
  };
  return bases[retailer] || '';
}

// ── Coles: use __NEXT_DATA__ ──
async function extractColesNextData(page) {
  return page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return [];
    try {
      const data = JSON.parse(el.textContent);
      const results = data?.props?.pageProps?.searchResults?.results || [];
      return results.map((item) => {
        const p = item.pricing || {};
        const wasPrice = p.was && p.was > 0 ? p.was : null;
        return {
          retailer: 'coles',
          name: `${item.brand || ''} ${item.name || ''}`.trim(),
          brand: item.brand || '',
          size: item.size || '',
          price: p.now || null,
          wasPrice,
          saveAmount: p.saveAmount || null,
          savePercent: p.savePercent || null,
          priceDescription: p.priceDescription || null,
          offerDescription: p.offerDescription || null,
          unitPrice: p.comparable || null,
          isOnSpecial: !!(wasPrice && wasPrice > p.now),
          imageUrl: item.imageUris?.[0] ? `https://productimages.coles.com.au/productimages${item.imageUris[0].uri}` : null,
          link: `https://www.coles.com.au/product/${item.id}`,
        };
      });
    } catch { return []; }
  });
}

// ── Woolworths: use intercepted API data ──
function extractWoolworthsApi(data) {
  const bundles = data?.Products || [];
  const products = [];
  for (const bundle of bundles) {
    const items = bundle.Products || [bundle];
    for (const item of items) {
      const wasPrice = item.WasPrice && item.WasPrice > item.Price ? item.WasPrice : null;
      products.push({
        retailer: 'woolworths',
        name: item.DisplayName || item.Name || '',
        brand: item.Brand || '',
        size: item.PackageSize || '',
        price: item.Price || null,
        wasPrice,
        saveAmount: item.SavingsAmount || null,
        savePercent: wasPrice ? Math.round(((wasPrice - item.Price) / wasPrice) * 100) : null,
        priceDescription: item.IsHalfPrice ? '1/2 Price' : (item.CentreTag?.TagContent || null),
        offerDescription: null,
        unitPrice: item.CupString || null,
        isOnSpecial: item.IsOnSpecial || false,
        imageUrl: item.SmallImageFile || null,
        link: item.Stockcode ? `https://www.woolworths.com.au/shop/productdetails/${item.Stockcode}/${item.UrlFriendlyName || ''}` : null,
      });
    }
  }
  return products;
}

// ── Generic DOM scraper for other retailers ──
async function extractGenericDOM(page, retailer, baseUrl) {
  return page.evaluate((ret, base) => {
    const products = [];
    const seen = new Set();

    // Find all elements that look like product cards
    const selectors = [
      '[class*="product-card"]', '[class*="ProductCard"]', '[class*="product-tile"]',
      '[class*="productCard"]', '[class*="product-item"]', '[data-testid*="product"]',
      '[class*="search-result"]', 'article[class*="product"]',
    ];

    let cards = [];
    for (const sel of selectors) {
      cards = document.querySelectorAll(sel);
      if (cards.length > 0) break;
    }

    // If no cards found, try finding any container with both a link and a price
    if (cards.length === 0) {
      const allDivs = document.querySelectorAll('div, li, article');
      cards = [...allDivs].filter(div => {
        const hasLink = div.querySelector('a[href]');
        const hasPrice = /\$\d+/.test(div.textContent);
        const size = div.getBoundingClientRect();
        return hasLink && hasPrice && size.width > 100 && size.height > 100 && size.height < 600;
      });
    }

    for (const card of cards) {
      try {
        // Find product name
        let name = '';
        const nameEl = card.querySelector('h2, h3, h4, [class*="name" i], [class*="title" i], [class*="Name"], [class*="Title"]');
        if (nameEl) {
          name = nameEl.textContent.trim();
        } else {
          const link = card.querySelector('a[href*="/product"], a[href*="/buy/"], a[href*="/p/"]');
          if (link) name = link.textContent.trim();
        }

        if (!name || name.length < 3 || name.length > 200) continue;
        if (seen.has(name)) continue;
        seen.add(name);

        // Find prices - look for dollar amounts
        const priceEls = card.querySelectorAll('[class*="price" i], [class*="Price"], [class*="amount"]');
        let price = null;
        let wasPrice = null;

        for (const el of priceEls) {
          const text = el.textContent.trim();
          const val = parsePrice(text);
          if (!val) continue;

          const isStruck = el.closest('del, s') || el.classList.toString().match(/was|original|old|strike|rrp/i);
          if (isStruck) {
            if (!wasPrice || val > wasPrice) wasPrice = val;
          } else {
            if (!price || val < price) price = val;
          }
        }

        // Fallback: find any dollar amounts in the card
        if (!price) {
          const allText = card.textContent;
          const matches = [...allText.matchAll(/\$([\d,]+\.?\d*)/g)];
          const values = matches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => v > 0 && v < 100000);
          if (values.length >= 2) {
            price = Math.min(...values);
            wasPrice = Math.max(...values);
            if (price === wasPrice) wasPrice = null;
          } else if (values.length === 1) {
            price = values[0];
          }
        }

        if (!price) continue;
        if (wasPrice && wasPrice <= price) wasPrice = null;

        // Find image and link
        const imgEl = card.querySelector('img[src*="http"]');
        const linkEl = card.querySelector('a[href*="/product"], a[href*="/buy/"], a[href*="/p/"], a[href*="/search"]');
        let link = linkEl?.getAttribute('href') || null;
        if (link && !link.startsWith('http')) link = base + link;

        // Find special/badge
        const badgeEl = card.querySelector('[class*="badge" i], [class*="special" i], [class*="save" i], [class*="promo" i], [class*="tag" i]');

        products.push({
          retailer: ret,
          name,
          brand: '',
          size: '',
          price,
          wasPrice,
          saveAmount: wasPrice ? Math.round((wasPrice - price) * 100) / 100 : null,
          savePercent: wasPrice ? Math.round(((wasPrice - price) / wasPrice) * 100) : null,
          priceDescription: badgeEl?.textContent?.trim()?.slice(0, 50) || null,
          offerDescription: null,
          unitPrice: null,
          isOnSpecial: !!(wasPrice && wasPrice > price),
          imageUrl: imgEl?.src || null,
          link,
        });
      } catch {}
    }

    function parsePrice(text) {
      if (!text) return null;
      const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
      return match ? parseFloat(match[1].replace(/,/g, '')) : null;
    }

    return products.slice(0, 20);
  }, retailer, baseUrl);
}
