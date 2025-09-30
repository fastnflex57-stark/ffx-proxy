export default async function handler(req, res) {
  // --- CORS : autorise ton domaine Shopify ---
  const ORIGINS = [
    "https://<TON-DOMAINE>.myshopify.com",
    "https://<TON-DOMAINE-CUSTOM>"   // optionnel si tu as un domaine custom
  ];
  const origin = req.headers.origin || "";
  const allow = ORIGINS.includes(origin) ? origin : ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const q = (req.query.q || "").toString();
  const country = (req.query.country || "FR").toString().toUpperCase();
  if (!q) return res.status(400).json({ error: "Missing q" });

  const appid = process.env.EBAY_APP_ID; // sera ajouté dans Vercel
  const siteid = country === "FR" ? 71 : 0; // eBay FR=71, US=0…

  const completedURL = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findCompletedItems&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${appid}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${encodeURIComponent(q)}&paginationInput.entriesPerPage=50&siteid=${siteid}`;
  const activeURL = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.13.0&SECURITY-APPNAME=${appid}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${encodeURIComponent(q)}&paginationInput.entriesPerPage=50&siteid=${siteid}`;

  const [completedRes, activeRes] = await Promise.all([fetch(completedURL), fetch(activeURL)]);
  const completed = await completedRes.json();
  const active = await activeRes.json();

  const getItems = r =>
    r.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item
    || r.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item
    || [];

  const completedItems = getItems(completed);
  const activeItems = getItems(active);

  const prices = arr => arr.map(it => parseFloat(it.sellingStatus?.[0]?.currentPrice?.[0]?.__value__) || null).filter(Boolean);
  const pc = prices(completedItems);
  const pa = prices(activeItems);
  const avg = a => (a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0);
  const std = a => { if (a.length < 2) return 0; const m = avg(a); return Math.sqrt(avg(a.map(v => (v - m) ** 2))); };

  res.status(200).json({
    keyword: q,
    country,
    counts: { completed: completedItems.length, active: activeItems.length },
    price: {
      avg_completed: +avg(pc).toFixed(2),
      avg_active: +avg(pa).toFixed(2),
      std_completed: +std(pc).toFixed(2)
    }
  });
}
