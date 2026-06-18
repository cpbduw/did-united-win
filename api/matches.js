// api/matches.js — Vercel serverless function
// Free tier: /v4/teams/{id}/matches is restricted. We query competition
// endpoints instead and filter for United server-side.

const TEAM_ID = 66; // Manchester United
const API_BASE = 'https://api.football-data.org/v4';
const COMPETITIONS = ['PL', 'CL']; // Free-tier comps United play in

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
    // One request per competition; 403s (not in that comp) are skipped silently
    const results = await Promise.all(
      COMPETITIONS.map(comp =>
        fetch(`${API_BASE}/competitions/${comp}/matches`, {
          headers: { 'X-Auth-Token': apiKey },
        })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    // All United matches across all comps
    const all = results
      .flatMap(d => (d && d.matches) ? d.matches : [])
      .filter(m => m.homeTeam.id === TEAM_ID || m.awayTeam.id === TEAM_ID);

    // Last 10 finished, oldest → newest (client reads last element as most recent)
    const finished = all
      .filter(m => m.status === 'FINISHED')
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      .slice(-10);

    // Next 3 upcoming, soonest first
    const upcoming = all
      .filter(m => ['SCHEDULED', 'TIMED'].includes(m.status))
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
      .slice(0, 3);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ matches: finished, upcoming });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
