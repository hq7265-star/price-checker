import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEEDS = [
  { url: "https://www.ozbargain.com.au/deals/feed", category: "all" },
  { url: "https://www.ozbargain.com.au/cat/groceries/feed", category: "groceries" },
  { url: "https://www.ozbargain.com.au/cat/health-beauty/feed", category: "health-beauty" },
];

function extractPrice(text: string) {
  if (!text) return { price: null, originalPrice: null };

  let price: number | null = null;
  let originalPrice: number | null = null;

  const wasMatch = text.match(/(?:was|rrp|originally)\s*\$\s*([\d,]+\.?\d*)/i);
  if (wasMatch) originalPrice = parseNumber(wasMatch[1]);

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

  const multiMatch = text.match(/(\d+)\s*for\s*\$\s*([\d,]+\.?\d*)/i);
  if (multiMatch) {
    const qty = parseInt(multiMatch[1]);
    const total = parseNumber(multiMatch[2]);
    if (qty > 0 && total) {
      price = Math.round((total / qty) * 100) / 100;
      return { price, originalPrice };
    }
  }

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

function parseNumber(str: string): number | null {
  if (!str) return null;
  const num = parseFloat(str.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function parseRssItems(xml: string) {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }> = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] ||
      block.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const desc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/)?.[1] || "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    items.push({ title, link, description: desc.slice(0, 500), pubDate });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let newDeals: Array<{ title: string; link: string; price: number | null }> = [];

    for (const feed of FEEDS) {
      try {
        const resp = await fetch(feed.url, {
          headers: { "User-Agent": "DiscountTracker/1.0" },
        });
        const xml = await resp.text();
        const items = parseRssItems(xml);

        for (const item of items) {
          const { price, originalPrice } = extractPrice(item.title);

          const { data: existing } = await supabase
            .from("deals")
            .select("id")
            .eq("link", item.link)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("deals").insert({
            source: "ozbargain",
            title: item.title,
            description: item.description,
            link: item.link,
            price,
            original_price: originalPrice,
            category: feed.category,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          });

          if (!error) {
            newDeals.push({ title: item.title, link: item.link, price });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${feed.url}:`, err);
      }
    }

    // --- Match watchlist & notify ---
    if (newDeals.length > 0) {
      const { data: settings } = await supabase
        .from("settings")
        .select("notification_email")
        .eq("id", 1)
        .single();

      const email = settings?.notification_email;

      if (email) {
        const { data: watchlistItems } = await supabase
          .from("watchlist")
          .select("*")
          .eq("is_active", true);

        if (watchlistItems && watchlistItems.length > 0) {
          const matched: Array<{
            watchlist_id: number;
            deal_id: number;
            keyword: string;
            title: string;
            link: string;
            price: number | null;
          }> = [];

          for (const item of watchlistItems) {
            const { data: deals } = await supabase
              .from("deals")
              .select("*")
              .ilike("title", `%${item.keyword}%`)
              .order("published_at", { ascending: false })
              .limit(20);

            if (!deals) continue;

            for (const deal of deals) {
              if (item.target_price && deal.price && deal.price > item.target_price) continue;

              const { data: alreadySent } = await supabase
                .from("notifications_log")
                .select("id")
                .eq("watchlist_id", item.id)
                .eq("deal_id", deal.id)
                .limit(1);

              if (alreadySent && alreadySent.length > 0) continue;

              matched.push({
                watchlist_id: item.id,
                deal_id: deal.id,
                keyword: item.keyword,
                title: deal.title,
                link: deal.link,
                price: deal.price,
              });
            }
          }

          if (matched.length > 0) {
            // Send email via Resend (set RESEND_API_KEY in Supabase secrets)
            const resendKey = Deno.env.get("RESEND_API_KEY");
            if (resendKey) {
              const dealRows = matched
                .map(
                  (d) =>
                    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${d.keyword}</td>` +
                    `<td style="padding:8px;border-bottom:1px solid #eee"><a href="${d.link}">${d.title}</a></td>` +
                    `<td style="padding:8px;border-bottom:1px solid #eee;color:#16a34a;font-weight:bold">${d.price ? "$" + d.price.toFixed(2) : "See deal"}</td></tr>`,
                )
                .join("");

              const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#4361ee">Discount Tracker Alert</h2>
                <p>We found ${matched.length} deal(s) matching your watchlist:</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr style="background:#f0f0f0"><th style="padding:8px;text-align:left">Keyword</th><th style="padding:8px;text-align:left">Deal</th><th style="padding:8px;text-align:left">Price</th></tr>
                  ${dealRows}
                </table>
                <p style="margin-top:16px;color:#666;font-size:12px">Sent by Discount Tracker.</p>
              </div>`;

              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Discount Tracker <onboarding@resend.dev>",
                  to: email,
                  subject: `Discount Alert: ${matched.length} deal(s) match your watchlist`,
                  html,
                }),
              });
            }

            // Log notifications
            for (const m of matched) {
              await supabase.from("notifications_log").insert({
                watchlist_id: m.watchlist_id,
                deal_id: m.deal_id,
              });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Fetched ${newDeals.length} new deals`, count: newDeals.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
