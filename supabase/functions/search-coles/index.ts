const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ error: "Search query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = `https://www.coles.com.au/search/products?q=${encodeURIComponent(query.trim())}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
      },
    });

    const html = await resp.text();

    // Extract __NEXT_DATA__ JSON from the HTML
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    );

    let products: unknown[] = [];

    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const results = data?.props?.pageProps?.searchResults?.results || [];

        products = results
          .map((item: Record<string, unknown>) => {
            const pricing = (item.pricing || {}) as Record<string, unknown>;
            const wasPrice =
              pricing.was && (pricing.was as number) > 0 ? pricing.was : null;

            return {
              name: item.name || "",
              brand: item.brand || "",
              description: item.description || "",
              size: item.size || "",
              price: pricing.now || null,
              wasPrice,
              saveAmount: pricing.saveAmount || null,
              savePercent: pricing.savePercent || null,
              saveStatement: pricing.saveStatement || null,
              priceDescription: pricing.priceDescription || null,
              promotionType: pricing.promotionType || null,
              offerDescription: pricing.offerDescription || null,
              unitPrice: pricing.comparable || null,
              isOnSpecial: !!(wasPrice && (wasPrice as number) > (pricing.now as number)),
              isMultiBuy: pricing.specialType === "MULTI_SAVE",
              imageUrl: (item.imageUris as Array<{ uri: string }>)?.[0]
                ? `https://productimages.coles.com.au/productimages${(item.imageUris as Array<{ uri: string }>)[0].uri}`
                : null,
              link: `https://www.coles.com.au/product/${item.id}`,
            };
          })
          .filter((p: Record<string, unknown>) => p.price != null);
      } catch {
        // JSON parse failed — return empty
      }
    }

    return new Response(
      JSON.stringify({ query, count: products.length, products }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to search Coles. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
