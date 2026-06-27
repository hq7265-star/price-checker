const puppeteer = require('puppeteer-core');

const query = process.argv[2];
if (!query) {
  console.log(JSON.stringify([]));
  process.exit(0);
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    );

    await page.goto(
      `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );

    // Wait for product data to load
    await page.waitForSelector('#__NEXT_DATA__', { timeout: 15000 }).catch(() => {});

    const products = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el) return [];

      try {
        const data = JSON.parse(el.textContent);
        const results = data?.props?.pageProps?.searchResults?.results || [];

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
      } catch {
        return [];
      }
    });

    console.log(JSON.stringify(products));
  } catch (err) {
    process.stderr.write(err.message);
    console.log(JSON.stringify([]));
  } finally {
    if (browser) await browser.close();
  }
})();
