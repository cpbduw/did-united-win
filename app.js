/* app.js — Did United Win? */

const TEAM_ID   = 66;
const FALLBACK_TZ = 'Europe/London'; // Manchester time

// User timezone — browser-detected (same result as IP geolocation, no extra request)
const userTz = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ; }
  catch { return FALLBACK_TZ; }
})();

// ── DOM refs ──────────────────────────────────────────────────────────────
const elAnswer        = document.getElementById('answer');
const elSubtitle      = document.getElementById('subtitle');
const elScorecard     = document.getElementById('scorecard');
const elMatchMeta     = document.getElementById('match-meta');
const elScoreline     = document.getElementById('scoreline');
const elMatchDate     = document.getElementById('match-date');
const elResultsSection = document.getElementById('results-section');
const elFilterBar     = document.getElementById('filter-bar');
const elResultsList   = document.getElementById('results-list');
const elTickerContent = document.getElementById('ticker-content');

// ── Boot ──────────────────────────────────────────────────────────────────
document.body.classList.add('loading');
elAnswer.textContent = '…';

fetchMatches();

// ── Data ──────────────────────────────────────────────────────────────────
async function fetchMatches() {
  try {
    const res = await fetch('/api/matches');
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    render(data.matches || [], data.upcoming || []);
  } catch (err) {
    showError(err.message);
  }
}

// ── Render ────────────────────────────────────────────────────────────────
function render(matches, upcoming) {
  document.body.classList.remove('loading');

  renderTicker(upcoming);

  if (!matches.length) {
    showOffSeason();
    return;
  }

  const last   = matches[matches.length - 1];
  const result = getResult(last);

  // Page theme + headline
  if (result === 'W') {
    document.body.classList.add('win');
    elAnswer.textContent  = 'YES';
    elSubtitle.textContent = 'They won';
    fireConfetti();
  } else if (result === 'D') {
    document.body.classList.add('draw');
    elAnswer.textContent  = 'DRAW';
    elSubtitle.textContent = 'They drew';
  } else {
    document.body.classList.add('loss');
    elAnswer.textContent  = 'NO';
    elSubtitle.textContent = 'They lost';
  }

  // Scorecard
  const isHome = last.homeTeam.id === TEAM_ID;
  const hg     = last.score.fullTime.home;
  const ag     = last.score.fullTime.away;

  elMatchMeta.textContent = `${last.competition.name} · ${isHome ? 'Home' : 'Away'}`;

  const homeSpan = `<span class="${last.homeTeam.id === TEAM_ID ? 'team-united' : ''}">${shortName(last.homeTeam.name)}</span>`;
  const awaySpan = `<span class="${last.awayTeam.id === TEAM_ID ? 'team-united' : ''}">${shortName(last.awayTeam.name)}</span>`;
  elScoreline.innerHTML = `${homeSpan} ${hg}&ndash;${ag} ${awaySpan}`;
  elMatchDate.textContent = formatDate(last.utcDate);
  elScorecard.hidden = false;

  // Previous results
  renderResults(matches);
}

// ── Ticker ────────────────────────────────────────────────────────────────
function renderTicker(upcoming) {
  const makeItem = m => {
    const home  = shortName(m.homeTeam.name);
    const away  = shortName(m.awayTeam.name);
    const comp  = m.competition.code || m.competition.name;
    const dtStr = formatFixtureDate(m.utcDate);
    return `<span class="ticker-item">`
      + `<span class="ticker-comp">${comp}</span>`
      + `<span class="ticker-dot"> ◆ </span>`
      + `${home} vs ${away}`
      + `<span class="ticker-dot"> · </span>`
      + `${dtStr}`
      + `</span>`;
  };

  let singleSet;
  if (!upcoming.length) {
    // Off-season — repeat placeholder enough times to fill any screen width
    const placeholder = `<span class="ticker-item">`
      + `<span class="ticker-comp">UNITED</span>`
      + `<span class="ticker-dot"> ◆ </span>`
      + `No upcoming fixtures · New season starts August 2026`
      + `</span>`;
    singleSet = placeholder.repeat(4);
  } else {
    singleSet = upcoming.map(makeItem).join('<span class="ticker-dot">  ◇  </span>');
  }

  // Duplicate for seamless CSS loop (animate translateX 0 → -50%)
  elTickerContent.innerHTML = singleSet + singleSet;
}

// ── Results list ──────────────────────────────────────────────────────────
function renderResults(matches) {
  // Build filter buttons from competitions present in data
  const comps = [...new Set(matches.map(m => m.competition.name))];

  elFilterBar.innerHTML = '';
  addFilterBtn('All', 'all', true);
  comps.forEach(c => addFilterBtn(c, c, false));

  // Show most-recent first
  const byDate = [...matches].reverse();
  drawList(byDate);

  elFilterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    elFilterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.comp;
    drawList(f === 'all' ? byDate : byDate.filter(m => m.competition.name === f));
  });

  elResultsSection.hidden = false;
}

function addFilterBtn(label, value, active) {
  const btn = document.createElement('button');
  btn.className    = 'filter-btn' + (active ? ' active' : '');
  btn.dataset.comp = value;
  btn.textContent  = label;
  elFilterBar.appendChild(btn);
}

function drawList(matches) {
  elResultsList.innerHTML = '';

  matches.forEach(m => {
    const r          = getResult(m);
    const hg         = m.score.fullTime.home;
    const ag         = m.score.fullTime.away;
    const homeUnited = m.homeTeam.id === TEAM_ID;
    const awayUnited = m.awayTeam.id === TEAM_ID;

    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `
      <span class="badge badge-${r}">${r}</span>
      <div class="result-row-content">
        <div class="result-row-score">
          <span class="team${homeUnited ? ' is-united' : ''}">${shortName(m.homeTeam.name)}</span>
          <span class="score">${hg}&ndash;${ag}</span>
          <span class="team away${awayUnited ? ' is-united' : ''}">${shortName(m.awayTeam.name)}</span>
        </div>
        <div class="result-row-meta">${m.competition.name} · ${formatDate(m.utcDate)}</div>
      </div>`;
    elResultsList.appendChild(row);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getResult(match) {
  const hg     = match.score.fullTime.home;
  const ag     = match.score.fullTime.away;
  const isHome = match.homeTeam.id === TEAM_ID;
  if (hg === ag) return 'D';
  return (isHome ? hg > ag : ag > hg) ? 'W' : 'L';
}

function shortName(name) {
  const map = {
    'Manchester United FC': 'Man Utd',
    'Manchester City FC':   'Man City',
    'Liverpool FC':         'Liverpool',
    'Arsenal FC':           'Arsenal',
    'Chelsea FC':           'Chelsea',
    'Tottenham Hotspur FC': 'Spurs',
    'Newcastle United FC':  'Newcastle',
    'Aston Villa FC':       'Aston Villa',
    'West Ham United FC':   'West Ham',
    'Brighton & Hove Albion FC': 'Brighton',
    'Brentford FC':         'Brentford',
    'Fulham FC':            'Fulham',
    'Wolverhampton Wanderers FC': 'Wolves',
    'Crystal Palace FC':    'Crystal Palace',
    'Everton FC':           'Everton',
    'AFC Bournemouth':      'Bournemouth',
    'Nottingham Forest FC': "Nott'm Forest",
    'Leicester City FC':    'Leicester',
    'Ipswich Town FC':      'Ipswich',
    'Southampton FC':       'Southampton',
    'Leeds United FC':      'Leeds',
    'Paris Saint-Germain FC': 'PSG',
    'Real Madrid CF':       'Real Madrid',
    'FC Barcelona':         'Barcelona',
    'Bayern München':       'Bayern',
    'Atletico de Madrid':   'Atlético',
  };
  return map[name] || name.replace(/ FC$/, '');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatFixtureDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: userTz,
    timeZoneName: 'short',
  });
}

// ── States ────────────────────────────────────────────────────────────────
function showOffSeason() {
  elAnswer.textContent   = '–';
  elSubtitle.textContent = 'No recent matches · Off season';
}

function showError(msg) {
  document.body.classList.remove('loading');
  elAnswer.textContent   = '?';
  elSubtitle.textContent = `Error: ${msg}`;
}

// ── Confetti ──────────────────────────────────────────────────────────────
function fireConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof confetti !== 'function') return;

  const base = {
    spread: 90,
    colors: ['#DA291C', '#ffffff', '#FBE122'],
  };
  // Three bursts at slight offsets
  confetti({ ...base, particleCount: 160, origin: { y: 0.6 } });
  setTimeout(() => confetti({ ...base, particleCount: 90, origin: { y: 0.55, x: 0.25 } }), 280);
  setTimeout(() => confetti({ ...base, particleCount: 90, origin: { y: 0.55, x: 0.75 } }), 460);
  setTimeout(() => confetti({ ...base, particleCount: 60, spread: 130, origin: { y: 0.45 } }), 720);
}
