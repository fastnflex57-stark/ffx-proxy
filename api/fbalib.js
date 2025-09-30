export default async function handler(req, res) {
  const ORIGINS = [
    "https://<TON-DOMAINE>.myshopify.com",
    "https://<TON-DOMAINE-CUSTOM>"
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

  const token = process.env.FB_ADLIB_TOKEN; // sera ajouté dans Vercel
  const api = `https://graph.facebook.com/v18.0/ads_archive?access_token=${token}&ad_type=ALL&ad_active_status=ACTIVE&search_terms=${encodeURIComponent(q)}&ad_reached_countries=${country}&limit=25`;

  const r = await fetch(api);
  const d = await r.json();
  const count = Array.isArray(d?.data) ? d.data.length : 0;
  res.status(200).json({ keyword: q, country, active_ads: count });
}
