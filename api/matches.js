// api/matches.js — Vercel serverless function
// Proxies football-data.org so the API key never leaves the server.
//
// FREE TIER NOTE: /v4/teams/{id}/matches is a paid endpoint.
// Free tier only allows competition-scoped queries, so we fetch
// Premier League + Champions League matches filtered by team ID,
// then merge and sort them ourselves.

const TEAM_ID = 66; // Manchester United
const API_BASE = 'https://api.football-data.org/v4';

// Free-tier competitions United could appear in.
// 403s from competitions they're not in are silently ignored.
const COMPETITIONS = ['PL', 'CL'];

module.exports = async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'FOOTBALL_DATA_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query each competition in parallel; ignore 403s (not in that comp this season)
    const results = await Promise.all(
      COMPETITIONS.map(comp =>
        fetch(`${API_BASE}/competitions/${comp}/matches?team=${TEAM_ID}&status=FINISHED`, {
          headers: { 'X-Auth-Token': apiKey },
        }).then(r => (r.ok ? r.json() : null))
      )
    );

    // Merge all matches, sort oldest→newest, keep last 10
    let matches = results
      .flatMap(d => (d && d.matches) ? d.matches : [])
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      .slice(-10);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
