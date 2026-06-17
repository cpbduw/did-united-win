const TEAM_ID = 66;
const API_BASE = 'https://api.football-data.org/v4';

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
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
