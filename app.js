const TEAM_ID = 66; 

async function fetchMatchData() {
    try {
        const response = await fetch('/api/matches');
        if (!response.ok) throw new Error('Network response error');
        
        const data = await response.json();
        if (!data.matches) throw new Error('No match data found');
        
        processMatches(data.matches);
    } catch (error) {
        document.getElementById('answer').innerText = "ERROR";
        document.getElementById('details').innerText = "Could not fetch latest data.";
        console.error("Fetch error:", error);
    }
}

function processMatches(matches) {
    const finishedMatches = matches.filter(m => m.status === "FINISHED").sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
    const upcomingMatches = matches.filter(m => m.status === "SCHEDULED" || m.status === "TIMED").sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    const lastMatch = finishedMatches[0];
    if (!lastMatch) return;

    let isWin = false;
    let resultText = "NO";
    const isManUtdHome = lastMatch.homeTeam.id === TEAM_ID;
    
    const utdScore = isManUtdHome ? lastMatch.score.fullTime.home : lastMatch.score.fullTime.away;
    const oppScore = isManUtdHome ? lastMatch.score.fullTime.away : lastMatch.score.fullTime.home;
    const opponentName = isManUtdHome ? lastMatch.awayTeam.name : lastMatch.homeTeam.name;

    const wonPenalties = lastMatch.score.winner === (isManUtdHome ? "HOME_TEAM" : "AWAY_TEAM");
    
    if (utdScore > oppScore || (utdScore === oppScore && wonPenalties)) {
        resultText = "YES";
        isWin = true;
    } else if (utdScore === oppScore && !wonPenalties) {
        resultText = "DRAW";
    }

    document.getElementById('answer').innerText = resultText;
    document.getElementById('details').innerText = `${utdScore} - ${oppScore} vs ${opponentName}`;

    if (isWin && (lastMatch.stage === "FINAL" || lastMatch.competition.name.includes("Cup"))) {
        triggerCupFinalConfetti();
    } else if (isWin) {
        triggerStandardWinConfetti();
    }

    renderList('previous-matches', finishedMatches.slice(1, 6), true);
    renderList('upcoming-matches', upcomingMatches.slice(0, 5), false);
}

function renderList(elementId, matches, isPast) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = ''; 

    matches.forEach(match => {
        const li = document.createElement('li');
        li.className = 'match-item';
        
        const isHome = match.homeTeam.id === TEAM_ID;
        const opponent = isHome ? match.awayTeam.name : match.homeTeam.name;
        const venueStatus = isHome ? "(H)" : "(A)";

        if (isPast) {
            const utdScore = isHome ? match.score.fullTime.home : match.score.fullTime.away;
            const oppScore = isHome ? match.score.fullTime.away : match.score.fullTime.home;
            li.innerHTML = `<span>vs ${opponent} ${venueStatus}</span> <strong>${utdScore}-${oppScore}</strong>`;
        } else {
            const matchDate = new Date(match.utcDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            li.innerHTML = `<span>vs ${opponent} ${venueStatus}</span> <span>${matchDate}</span>`;
        }
        listElement.appendChild(li);
    });
}

function triggerStandardWinConfetti() {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#DA291C', '#FFFFFF', '#000000'] });
}

function triggerCupFinalConfetti() {
    const end = Date.now() + 4000;
    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#DA291C', '#FBE122'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#DA291C', '#FBE122'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

fetchMatchData();
