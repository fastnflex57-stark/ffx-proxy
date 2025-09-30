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
  if (!q) return res.status(400).json({ error: "Missing q" });

  const page = q.trim().replace(/\s+/g, "_");
  const end = new Date(); end.setDate(end.getDate() - 1);
  const start = new Date(); start.setDate(start.getDate() - 60);
  const fmt = d => d.toISOString().slice(0,10).replace(/-/g, "");
  const urlViews = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/all-agents/${encodeURIComponent(page)}/daily/${fmt(start)}/${fmt(end)}`;

  const r = await fetch(urlViews);
  const j = await r.json();
  const views = Array.isArray(j?.items) ? j.items.map(it => it.views) : [];
  const sum = views.reduce((a,b)=>a+b, 0);
  const last30 = views.slice(-30).reduce((a,b)=>a+b, 0);
  const prev30 = views.slice(-60, -30).reduce((a,b)=>a+b, 0);
  const trend = prev30 ? ((last30 - prev30) / prev30) : 0;

  res.status(200).json({ keyword: q, views_60d: sum, trend_30d: +trend.toFixed(3) });
}
