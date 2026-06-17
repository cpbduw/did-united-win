/* app.js — Did United Win? */

const TEAM_ID = 66; // Manchester United
const TEAM_NAME = 'Manchester United';

// ── DOM refs ──────────────────────────────────────────────────────────────
const elAnswer   = document.getElementById('answer');
const elSubtitle = document.getElementById('subtitle');
const elScorecard   = document.getElementById('scorecard');
const elMatchMeta   = document.getElementById('match-meta');
const elScoreline   = document.getElementById('scoreline');
const elMatchDate   = document.getElementById('match-date');
const elFormSection = document.getElementById('form-section');
const elFormGroups  = document.getElementById('form-groups');

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
    render(data.matches || []);
  } catch (err) {
    showError(err.message);
  }
}

// ── Render ────────────────────────────────────────────────────────────────
function render(matches) {
  document.body.classList.remove('loading');

  if (!matches.length) {
    showOffSeason();
    return;
  }

  const last = matches[matches.length - 1]; // most recent finished match
  const result = getResult(last);

  // ── Page theme & headline
  if (result === 'W') {
    document.body.classList.add('win');
    elAnswer.textContent = 'YES';
    elSubtitle.textContent = 'United won ✔';
    fireConfetti();
  } else if (result === 'D') {
    document.body.classList.add('draw');
    elAnswer.textContent = 'DRAW';
    elSubtitle.textContent = 'United drew';
  } else {
    document.body.classList.add('loss');
    elAnswer.textContent = 'NO';
    elSubtitle.textContent = 'United lost';
  }

  // ── Scorecard
  const home = last.homeTeam.name;
  const away = last.awayTeam.name;
  const hg   = last.score.fullTime.home;
  const ag   = last.score.fullTime.away;
  const comp = last.competition.name;
  const isHome = last.homeTeam.id === TEAM_ID;

  elMatchMeta.textContent = `${comp} · ${isHome ? 'Home' : 'Away'}`;

  const homeSpan = `<span class="${last.homeTeam.id === TEAM_ID ? 'team-united' : ''}">${shortName(home)}</span>`;
  const awaySpan = `<span class="${last.awayTeam.id === TEAM_ID ? 'team-united' : ''}">${shortName(away)}</span>`;
  elScoreline.innerHTML = `${homeSpan} ${hg}&ndash;${ag} ${awaySpan}`;

  elMatchDate.textContent = formatDate(last.utcDate);
  elScorecard.hidden = false;

  // ── Form grouped by competition
  renderForm(matches);
}

// ── Form ──────────────────────────────────────────────────────────────────
function renderForm(matches) {
  // Group by competition name, most-recent match first in each group
  const groups = {};
  [...matches].reverse().forEach(m => {
    const comp = m.competition.name;
    if (!groups[comp]) groups[comp] = [];
    groups[comp].push(m);
  });

  elFormGroups.innerHTML = '';

  Object.entries(groups).forEach(([comp, ms]) => {
    const div = document.createElement('div');
    div.className = 'form-group';

    const heading = document.createElement('div');
    heading.className = 'form-group-name';
    heading.textContent = comp;
    div.appendChild(heading);

    const row = document.createElement('div');
    row.className = 'form-row';

    ms.forEach(m => {
      const r = getResult(m);
      const opp = m.homeTeam.id === TEAM_ID ? m.awayTeam.name : m.homeTeam.name;
      const hg  = m.score.fullTime.home;
      const ag  = m.score.fullTime.away;

      const item = document.createElement('div');
      item.className = 'form-item';
      item.title = `${formatDate(m.utcDate)}`;

      item.innerHTML = `<span class="badge badge-${r}">${r}</span> vs ${shortName(opp)} ${hg}–${ag}`;
      row.appendChild(item);
    });

    div.appendChild(row);
    elFormGroups.appendChild(div);
  });

  elFormSection.hidden = false;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns 'W', 'D', or 'L' from United's perspective. */
function getResult(match) {
  const hg = match.score.fullTime.home;
  const ag = match.score.fullTime.away;
  const isHome = match.homeTeam.id === TEAM_ID;

  if (hg === ag) return 'D';
  const unitedWon = isHome ? hg > ag : ag > hg;
  return unitedWon ? 'W' : 'L';
}

/** Shortens long club names to fit on one line. */
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
  };
  return map[name] || name.replace(/ FC$/, '');
}

/** Formats an ISO date string as "Sat 14 Jun 2025". */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Off-season / error states ─────────────────────────────────────────────
function showOffSeason() {
  elAnswer.textContent = '–';
  elSubtitle.textContent = 'No finished matches found · Season may not have started yet';
}

function showError(msg) {
  document.body.classList.remove('loading');
  elAnswer.textContent = '?';
  elSubtitle.textContent = `Error: ${msg}`;
}

// ── Confetti ──────────────────────────────────────────────────────────────
function fireConfetti() {
  // Respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof confetti !== 'function') return;

  // United red + white burst
  const opts = {
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#DA291C', '#ffffff', '#FBE122'],
  };

  confetti(opts);
  // Second burst offset slightly for depth
  setTimeout(() => confetti({ ...opts, particleCount: 60, origin: { y: 0.5, x: 0.3 } }), 200);
  setTimeout(() => confetti({ ...opts, particleCount: 60, origin: { y: 0.5, x: 0.7 } }), 350);
}
