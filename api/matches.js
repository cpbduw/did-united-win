export default async function handler(request, response) {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const teamId = 66; 

  try {
    const apiResponse = await fetch(`https://api.football-data.org/v4/teams/${teamId}/matches`, {
      headers: {
        'X-Auth-Token': apiKey
      }
    });

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
