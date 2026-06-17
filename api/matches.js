// api/matches.js — Vercel serverless function
// Proxies football-data.org so the API key never leaves the server
// and the browser has no CORS issues (same-origin request to /api/matches).

const TEAM_ID = 66; // Manchester United
const API_BASE = 'https://api.football-data.org/v4';

module.exports = async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'FOOTBALL_DATA_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch the 10 most-recent finished matches for the team.
    // Free tier: results are delayed; real-time requires a paid plan.
    const url = `${API_BASE}/teams/${TEAM_ID}/matches?status=FINISHED&limit=10`;

    const upstream = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({
        error: `football-data.org returned ${upstream.status}`,
        detail: text,
      });
    }

    const data = await upstream.json();

    // Cache for 5 minutes on Vercel's edge; serve stale for up to 60 s
    // while revalidating. This keeps us well under the free-tier 10 req/min limit.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
