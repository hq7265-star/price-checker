const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_RETAILERS = ["coles", "woolworths", "chemistwarehouse", "priceline", "myer", "davidjones"];

const RETAILER_LABELS: Record<string, string> = {
  coles: "Coles",
  woolworths: "Woolworths",
  chemistwarehouse: "Chemist Warehouse",
  priceline: "Priceline",
  myer: "Myer",
  davidjones: "David Jones",
};

const RETAILER_URLS: Record<string, (q: string) => string> = {
  coles: (q) => `https://www.coles.com.au/search/products?q=${encodeURIComponent(q)}`,
  woolworths: (q) =>
    `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(q)}&pageSize=20&sortType=TraderRelevance&isSpecial=false`,
  chemistwarehouse: (q) =>
    `https://www.chemistwarehouse.com.au/search?searchtext=${encodeURIComponent(q)}`,
  priceline: (q) =>
    `https://api.priceline.com.au/occ/v2/priceline/products/search?query=${encodeURIComponent(q)}&pageSize=20&lang=en&curr=AUD`,
  myer: (q) => `https://www.myer.com.au/search?query=${encodeURIComponent(q)}`,
  davidjones: (q) => `https://www.davidjones.com/search?q=${encodeURIComponent(q)}`,
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

interface Product {
  retailer: string;
  name: string;
  brand: string;
  size: string;
  price: number | null;
  wasPrice: number | null;
  saveAmount: number | null;
  savePercent: number | null;
  priceDescription: string | null;
  offerDescription: string | null;
  unitPrice: string | null;
  isOnSpecial: boolean;
  imageUrl: string | null;
  link: string | null;
  isCheapest?: boolean;
}

// --- Coles: parse __NEXT_DATA__ from HTML ---
async function searchColes(query: string): Promise<Product[]> {
  const resp = await fetch(RETAILER_URLS.coles(query), {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
  });
  const html = await resp.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    const results = data?.props?.pageProps?.searchResults?.results || [];
    return results.map((item: any) => {
      const p = item.pricing || {};
      const wasPrice = p.was && p.was > 0 ? p.was : null;
      return {
        retailer: "coles",
        name: `${item.brand || ""} ${item.name || ""}`.trim(),
        brand: item.brand || "",
        size: item.size || "",
        price: p.now || null,
        wasPrice,
        saveAmount: p.saveAmount || null,
        savePercent: p.savePercent || null,
        priceDescription: p.priceDescription || null,
        offerDescription: p.offerDescription || null,
        unitPrice: p.comparable || null,
        isOnSpecial: !!(wasPrice && wasPrice > p.now),
        imageUrl: item.imageUris?.[0]
          ? `https://productimages.coles.com.au/productimages${item.imageUris[0].uri}`
          : null,
        link: `https://www.coles.com.au/product/${item.id}`,
      };
    }).filter((p: Product) => p.price != null);
  } catch {
    return [];
  }
}

// --- Woolworths: call their search API directly ---
async function searchWoolworths(query: string): Promise<Product[]> {
  try {
    const resp = await fetch(RETAILER_URLS.woolworths(query), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        Origin: "https://www.woolworths.com.au",
        Referer: "https://www.woolworths.com.au/",
      },
    });
    const data = await resp.json();
    const bundles = data?.Products || [];
    const products: Product[] = [];

    for (const bundle of bundles) {
      const items = bundle.Products || [bundle];
      for (const item of items) {
        const wasPrice = item.WasPrice && item.WasPrice > item.Price ? item.WasPrice : null;
        products.push({
          retailer: "woolworths",
          name: item.DisplayName || item.Name || "",
          brand: item.Brand || "",
          size: item.PackageSize || "",
          price: item.Price || null,
          wasPrice,
          saveAmount: item.SavingsAmount || null,
          savePercent: wasPrice
            ? Math.round(((wasPrice - item.Price) / wasPrice) * 100)
            : null,
          priceDescription: item.IsHalfPrice
            ? "1/2 Price"
            : item.CentreTag?.TagContent || null,
          offerDescription: null,
          unitPrice: item.CupString || null,
          isOnSpecial: item.IsOnSpecial || false,
          imageUrl: item.SmallImageFile || null,
          link: item.Stockcode
            ? `https://www.woolworths.com.au/shop/productdetails/${item.Stockcode}/${item.UrlFriendlyName || ""}`
            : null,
        });
      }
    }
    return products.filter((p) => p.price != null);
  } catch {
    return [];
  }
}

// --- Priceline: direct API ---
async function searchPriceline(query: string): Promise<Product[]> {
  try {
    const resp = await fetch(RETAILER_URLS.priceline(query), {
      headers: {
        Accept: "application/json",
        Origin: "https://www.priceline.com.au",
        Referer: "https://www.priceline.com.au/",
        "User-Agent": USER_AGENT,
      },
    });
    const data = await resp.json();
    return (data.products || []).map((p: any) => {
      const price = p.discountedPrice?.value || p.price?.value || null;
      const wasPrice = p.discountedPrice ? p.price?.value : null;
      return {
        retailer: "priceline",
        name: p.name || "",
        brand: p.brandName || "",
        size: "",
        price,
        wasPrice: wasPrice && wasPrice > price ? wasPrice : null,
        saveAmount:
          wasPrice && wasPrice > price
            ? Math.round((wasPrice - price) * 100) / 100
            : null,
        savePercent:
          wasPrice && wasPrice > price
            ? Math.round(((wasPrice - price) / wasPrice) * 100)
            : null,
        priceDescription: p.discountedPrice ? "ON SALE" : null,
        offerDescription: null,
        unitPrice: null,
        isOnSpecial: !!p.discountedPrice,
        imageUrl: p.image_url || null,
        link: p.url || null,
      };
    });
  } catch {
    return [];
  }
}

// --- Generic HTML scraper for Chemist Warehouse, Myer, David Jones ---
function parsePrice(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
  return match ? parseFloat(match[1].replace(/,/g, "")) : null;
}

function extractProductsFromHtml(html: string, retailer: string, baseUrl: string): Product[] {
  const products: Product[] = [];
  const seen = new Set<string>();

  // Find JSON-LD product data
  const jsonLdMatches = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = data["@type"] === "ItemList" ? data.itemListElement || [] : [];
      for (const entry of items) {
        const item = entry.item || entry;
        if (!item.name) continue;
        const name = item.name;
        if (seen.has(name)) continue;
        seen.add(name);

        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const price = offer?.price ? parseFloat(offer.price) : null;
        if (!price) continue;

        products.push({
          retailer,
          name,
          brand: item.brand?.name || "",
          size: "",
          price,
          wasPrice: null,
          saveAmount: null,
          savePercent: null,
          priceDescription: null,
          offerDescription: null,
          unitPrice: null,
          isOnSpecial: false,
          imageUrl: item.image || null,
          link: item.url || null,
        });
      }
    } catch { /* skip */ }
  }

  if (products.length > 0) return products.slice(0, 20);

  // Fallback: regex-based extraction of product-like blocks
  // Look for patterns like product name + price together
  const priceBlocks = html.matchAll(
    /(?:data-testid|class)="[^"]*(?:product|item|card)[^"]*"[\s\S]{0,2000}?\$([\d,.]+)/gi,
  );
  for (const block of priceBlocks) {
    const snippet = block[0];
    const price = parseFloat(block[1].replace(/,/g, ""));
    if (!price || price > 100000) continue;

    // Try to find a product name in the snippet
    const nameMatch = snippet.match(
      /(?:title|alt|aria-label)="([^"]{3,120})"/i,
    );
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (seen.has(name)) continue;
    seen.add(name);

    const linkMatch = snippet.match(/href="(\/[^"]+)"/);
    const link = linkMatch ? baseUrl + linkMatch[1] : null;

    const imgMatch = snippet.match(/src="(https?:\/\/[^"]+)"/);

    products.push({
      retailer,
      name,
      brand: "",
      size: "",
      price,
      wasPrice: null,
      saveAmount: null,
      savePercent: null,
      priceDescription: null,
      offerDescription: null,
      unitPrice: null,
      isOnSpecial: false,
      imageUrl: imgMatch?.[1] || null,
      link,
    });

    if (products.length >= 20) break;
  }

  return products;
}

async function searchGeneric(query: string, retailer: string): Promise<Product[]> {
  const baseUrls: Record<string, string> = {
    chemistwarehouse: "https://www.chemistwarehouse.com.au",
    myer: "https://www.myer.com.au",
    davidjones: "https://www.davidjones.com",
  };

  try {
    const resp = await fetch(RETAILER_URLS[retailer](query), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-AU,en;q=0.9",
      },
    });
    const html = await resp.text();
    return extractProductsFromHtml(html, retailer, baseUrls[retailer] || "");
  } catch {
    return [];
  }
}

function filterRelevant(products: Product[], query: string): Product[] {
  if (!products.length) return [];

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (!words.length)
    return products
      .filter((p) => p.price != null)
      .slice(0, 5);

  const minRatio = words.length <= 3 ? 1.0 : 0.6;

  return products
    .filter((p) => p.price != null)
    .map((p) => {
      const text = `${p.name} ${p.brand}`.toLowerCase();
      const matches = words.filter((w) => text.includes(w));
      return { ...p, relevance: matches.length / words.length };
    })
    .filter((p) => p.relevance >= minRatio)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map(({ relevance, ...rest }) => rest as Product);
}

async function searchRetailer(
  retailer: string,
  query: string,
): Promise<{ retailer: string; label: string; products: Product[]; error?: string }> {
  try {
    let products: Product[];
    if (retailer === "coles") products = await searchColes(query);
    else if (retailer === "woolworths") products = await searchWoolworths(query);
    else if (retailer === "priceline") products = await searchPriceline(query);
    else products = await searchGeneric(query, retailer);

    const filtered = filterRelevant(products, query);
    return { retailer, label: RETAILER_LABELS[retailer], products: filtered };
  } catch (err: any) {
    return {
      retailer,
      label: RETAILER_LABELS[retailer],
      products: [],
      error: err.message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, retailers: requestedRetailers } = await req.json();

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const retailerList = requestedRetailers
      ? (requestedRetailers as string[]).filter((r: string) => ALL_RETAILERS.includes(r))
      : ALL_RETAILERS;

    // Search all retailers in parallel (batches of 3)
    const results: Awaited<ReturnType<typeof searchRetailer>>[] = [];
    for (let i = 0; i < retailerList.length; i += 3) {
      const batch = retailerList.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map((r) => searchRetailer(r, query.trim())),
      );
      results.push(...batchResults);
    }

    // Mark cheapest
    let cheapestPrice = Infinity;
    for (const r of results) {
      for (const p of r.products) {
        if (p.price && p.price < cheapestPrice) cheapestPrice = p.price;
      }
    }
    for (const r of results) {
      for (const p of r.products) {
        p.isCheapest = p.price === cheapestPrice && cheapestPrice < Infinity;
      }
    }

    return new Response(
      JSON.stringify({ query, retailers: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Search failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
