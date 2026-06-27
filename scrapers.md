# Retailer Scraper Findings

## Architecture

Each retailer search runs in a separate Puppeteer (headless Chrome) worker process to bypass bot detection. The server spawns workers in parallel (batches of 3) and collects results.

**Worker file**: `server/sources/retailer-worker.js`
**Orchestrator**: `server/sources/search-all.js`
**API endpoint**: `GET /api/compare/search?q=<query>`

---

## Coles

**Status**: Working (when not IP-blocked)
**Method**: Puppeteer → parse `__NEXT_DATA__` embedded JSON
**Search URL**: `https://www.coles.com.au/search/products?q=<query>`

### Data source
Coles is a Next.js site. Product data is embedded in `<script id="__NEXT_DATA__">` as JSON. Path: `props.pageProps.searchResults.results[]`.

### Product fields
| Field | Path |
|-------|------|
| Name | `item.name` |
| Brand | `item.brand` |
| Size | `item.size` |
| Price | `item.pricing.now` |
| Was Price | `item.pricing.was` (0 if not on special) |
| Save Amount | `item.pricing.saveAmount` |
| Save Percent | `item.pricing.savePercent` |
| Description | `item.pricing.priceDescription` (e.g. "1/2 Price") |
| Special Type | `item.pricing.specialType` (PERCENT_OFF, MULTI_SAVE) |
| Multi-buy | `item.pricing.offerDescription` (e.g. "Buy 2 for $17") |
| Unit Price | `item.pricing.comparable` (e.g. "$21.43/ 100ea") |
| Image | `item.imageUris[0].uri` (prefix with `https://productimages.coles.com.au/productimages`) |
| Link | `https://www.coles.com.au/product/<item.id>` |

### Bot detection
- **Imperva/Incapsula** bot protection
- Returns a 6KB JavaScript challenge page ("Pardon Our Interruption") when detected
- Plain HTTP requests (axios/cheerio) get blocked after a few requests from the same process
- Puppeteer with `navigator.webdriver = false` passes initially but gets rate-limited after heavy use
- **Cooldown**: IP block expires after some time (exact duration unknown, estimated 15-60 min)

### Known issues
- Repeated requests from same IP get temporarily blocked
- The old Coles mobile API (`api.coles.com.au`) with API keys is no longer accessible (DNS fails)

---

## Woolworths

**Status**: Working
**Method**: Puppeteer → intercept `/apis/ui/Search/products` API response
**Search URL**: `https://www.woolworths.com.au/shop/search/products?searchTerm=<query>`

### Data source
Woolworths is also Next.js but product data is NOT in `__NEXT_DATA__` (only 391 chars of shell data). Instead, the page makes a POST request to `/apis/ui/Search/products` which returns a 325KB JSON response.

We intercept this API response via Puppeteer's `page.on('response')`.

### Product fields
| Field | Path |
|-------|------|
| Name | `item.DisplayName` or `item.Name` |
| Brand | `item.Brand` |
| Size | `item.PackageSize` |
| Price | `item.Price` |
| Was Price | `item.WasPrice` |
| Is On Special | `item.IsOnSpecial` (boolean) |
| Is Half Price | `item.IsHalfPrice` (boolean) |
| Savings Amount | `item.SavingsAmount` |
| Unit Price | `item.CupString` (e.g. "$9.75 per 100EA") |
| Image | `item.SmallImageFile` (full CDN URL) |
| Link | `https://www.woolworths.com.au/shop/productdetails/<item.Stockcode>/<item.UrlFriendlyName>` |

### API response structure
```
{
  Products: [
    {
      Products: [item, ...],  // nested array
      Name: "bundle name",
      DisplayName: "..."
    }, ...
  ],
  SearchResultsCount: 24,
  ...
}
```

### Known issues
- Returns general products (not just health/supplements) — Woolworths sells homewares, clothing, etc.
- No bot detection issues observed so far

---

## Chemist Warehouse

**Status**: Not working
**Method**: Puppeteer → DOM scraping (attempted)
**Search URL**: `https://www.chemistwarehouse.com.au/search?searchtext=<query>`

### Findings
- Site is built with Next.js but `__NEXT_DATA__` only contains header/footer/microcopy data — NO product data
- Search results are loaded entirely via client-side JavaScript after initial page load
- The page title shows "Search Results for: undefined" — meaning their JS doesn't read the `searchtext` URL param correctly in headless Chrome
- Tried both `searchtext` and `searchText` parameter names — neither works
- Products are fetched from Contentful CMS (`cdn.contentful.com`) and possibly other APIs
- A large JSON response (457KB) is loaded from `/_next/data/<buildId>/en.json` but doesn't contain search results

### Next steps to fix
1. **Intercept API calls**: Monitor all network requests during a search to find the actual product search API endpoint
2. **Try direct API**: CW might have an internal search API similar to Woolworths — need to find it
3. **Try URL with hash routing**: CW might use client-side routing that doesn't work with direct URL navigation
4. **Alternative**: Try scraping individual product pages instead of search results

---

## Priceline

**Status**: Not working
**Method**: Puppeteer → DOM scraping (attempted)
**Search URL**: `https://www.priceline.com.au/search?q=<query>`

### Findings
- Page loads with title "Search Results Page" but no product cards are rendered
- Only 1 product link found in the entire DOM
- The page appears to use a complex SPA framework (possibly SAP Commerce / Spartacus based on `cx-state` in script data)
- Product data is loaded dynamically via client-side API calls
- No `__NEXT_DATA__` or similar embedded JSON found

### Next steps to fix
1. **Intercept API calls**: Like Woolworths, intercept XHR/fetch responses that contain product data
2. **Check for SAP Commerce API**: If using SAP Spartacus, there might be a `/rest/v2/` or `/occ/v2/` API endpoint
3. **Longer wait time**: Products might need more than 5 seconds to load — try 10-15 seconds
4. **Search via sitemap**: As an alternative, scrape individual product pages discovered via sitemap

---

## Myer

**Status**: Partially working
**Method**: Puppeteer → generic DOM scraping
**Search URL**: `https://www.myer.com.au/search?query=<query>`

### Findings
- DOM scraping works and returns products with prices
- Product cards are detectable via generic `[class*="product"]` selectors
- Prices are extracted from dollar amounts in the card text

### Known issues
- Search returns broad results (e.g. "ginkgo" matches "gin" glasses)
- Product names sometimes include extra text from nearby elements
- No special/discount detection implemented — need to identify the CSS classes for sale badges

### Next steps to fix
1. Refine product name extraction to avoid grabbing extra text
2. Add specific selectors for Myer's sale/discount badges
3. Filter results more strictly to match the search query

---

## David Jones

**Status**: Partially working
**Method**: Puppeteer → generic DOM scraping
**Search URL**: `https://www.davidjones.com/search?q=<query>`

### Findings
- DOM scraping returns some products but parsing is unreliable
- Price extraction sometimes grabs wrong values (e.g. "$32" instead of "$460")
- Product names sometimes include price text concatenated into the name

### Known issues
- Price parsing grabs the first dollar amount which may not be the product price
- Product names are polluted with price text from adjacent elements
- Duplicate products appear (same item scraped from different DOM levels)

### Next steps to fix
1. Use more specific CSS selectors for David Jones product cards
2. Inspect the actual DOM structure to find the correct price elements
3. Add deduplication by product name or URL
4. David Jones may also have an internal API that can be intercepted

---

## General Notes

### Bot detection landscape
- **Coles**: Imperva/Incapsula — aggressive, blocks after a few requests
- **Chemist Warehouse**: Unclear — page loads but search doesn't work
- **Woolworths**: No bot detection observed (most reliable)
- **Priceline**: Unclear — page loads but products don't render
- **Myer/David Jones**: No bot detection observed, DOM scraping works

### Performance
- Each Puppeteer worker takes 10-20 seconds to complete
- 6 retailers in batches of 3 = ~30-40 seconds total search time
- Consider caching results to avoid repeated scraping

### Recommended priority for fixes
1. **Chemist Warehouse** — highest value (pharmacy/health products, discounts are common)
2. **Priceline** — high value (beauty/health products)
3. **David Jones** — fix price parsing
4. **Myer** — fix name extraction and add discount detection
5. **Coles** — already works, just needs IP block cooldown
