(() => {
  const DATA_URL = '/data/cricket/site.json';
  const PLAY_CRICKET = 'https://loughboroughoutwoods.play-cricket.com/';
  const esc = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  const parseDate = (value) => {
    const [day, month, year] = String(value).split('/').map(Number);
    return new Date(year, month - 1, day);
  };
  const dateText = (value, long = false) => parseDate(value).toLocaleDateString('en-GB', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
  const todayKey = () => new Date().toLocaleDateString('en-CA');
  const matchDateKey = (value) => {
    const d = parseDate(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const teamName = (side) => `${side.club}${side.team ? ` · ${side.team}` : ''}`;
  const scoreFor = (match, teamId) => {
    const innings = (match.innings || []).filter((item) => item.teamId === String(teamId));
    if (!innings.length) return '';
    return innings.map((item) => {
      let suffix = '';
      if (String(item.wickets) && String(item.wickets) !== '10') suffix = `/${item.wickets}`;
      if (item.declared) suffix += 'd';
      return `${item.runs}${suffix}`;
    }).join(' & ');
  };
  const outcome = (match) => {
    const won = match.resultAppliedTo && match.resultAppliedTo === match.teamId;
    if (match.result === 'W') return won ? 'W' : 'L';
    if (/tie/i.test(match.resultDescription)) return 'T';
    return 'D';
  };
  const resultLine = (match) => {
    const own = scoreFor(match, match.teamId);
    const otherId = match.home.teamId === match.teamId ? match.away.teamId : match.home.teamId;
    const other = scoreFor(match, otherId);
    return { own: own || '—', other: other || '—' };
  };
  const opponent = (match) => match.outwoodsHome ? match.away : match.home;
  const nextEmpty = (season) => {
    const year = Number(season) || new Date().getFullYear();
    const next = Math.max(year + 1, new Date().getFullYear() + 1);
    return `<article class="match-card match-card-empty"><span class="match-eyebrow">Between seasons</span><h3>That’s stumps for ${year}.</h3><p>The next fixtures aren’t on Play-Cricket yet. When the ${next} schedule is published, the next match will appear here automatically.</p><a class="text-link" href="${PLAY_CRICKET}" target="_blank" rel="noreferrer">Visit Play-Cricket</a></article>`;
  };
  const fixtureCard = (match, large = false) => {
    const matchday = matchDateKey(match.date) === todayKey();
    return `<article class="match-card ${large ? 'match-card-featured' : ''} ${matchday ? 'is-matchday' : ''}">
      <div class="match-card-top"><span class="match-eyebrow">${matchday ? 'Matchday' : 'Next up'}</span><span class="team-pill">${esc(match.team)}</span></div>
      <p class="match-date">${esc(dateText(match.date))}${match.time ? ` · ${esc(match.time)}` : ''}</p>
      <div class="match-sides"><strong>Loughborough Outwoods</strong><span>v</span><strong>${esc(teamName(opponent(match)))}</strong></div>
      <p class="match-meta">${esc(match.ground || (match.outwoodsHome ? 'Home' : 'Away'))}${match.competition ? ` · ${esc(match.competition)}` : ''}</p>
      <a class="text-link" href="${esc(match.playCricketUrl)}" target="_blank" rel="noreferrer">${matchday ? 'Follow on Play-Cricket' : 'Match details'}</a>
    </article>`;
  };
  const resultCard = (match, data, large = false) => {
    const scores = resultLine(match);
    const mark = outcome(match);
    const href = data.matches && data.matches[match.id] ? `/cricket/match.html?id=${encodeURIComponent(match.id)}` : match.playCricketUrl;
    const external = href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : '';
    return `<article class="match-card result-card ${large ? 'match-card-featured' : ''}">
      <div class="match-card-top"><span class="match-eyebrow">Last time out</span><span class="result-mark result-${mark.toLowerCase()}">${mark}</span></div>
      <p class="match-date">${esc(dateText(match.date))} · ${esc(match.team)}</p>
      <div class="score-lines"><div><strong>Outwoods</strong><b>${esc(scores.own)}</b></div><div><span>${esc(opponent(match).club)}</span><b>${esc(scores.other)}</b></div></div>
      <p class="result-description">${esc(match.resultDescription || 'Result recorded on Play-Cricket')}</p>
      <a class="text-link" href="${esc(href)}"${external}>View scorecard</a>
    </article>`;
  };

  function renderHome(data) {
    const grid = document.querySelector('[data-home-match-grid]');
    if (!grid) return;
    const next = data.fixtures && data.fixtures[0];
    const latest = data.results && data.results[0];
    grid.innerHTML = `${next ? fixtureCard(next, true) : nextEmpty(data.season)}${latest ? resultCard(latest, data, true) : `<article class="match-card match-card-empty"><span class="match-eyebrow">Latest result</span><h3>No result available.</h3><p>Results will appear here when they are published on Play-Cricket.</p></article>`}`;
  }

  function tableHtml(data, teamId) {
    const table = (data.tables || []).find((item) => (item.values || []).some((row) => String(row.team_id) === String(teamId)));
    if (!table) return '<div class="cricket-empty"><h3>League table unavailable</h3><p>The new table will appear once the competition is published on Play-Cricket.</p></div>';
    const headings = table.headings || {};
    const entries = Object.entries(headings);
    const wanted = entries.filter(([, label]) => /^(team|p|w|l|pts)$/i.test(String(label).trim()));
    const columns = wanted.length >= 3 ? wanted : entries.slice(0, 5);
    return `<div class="league-table-wrap"><table class="league-table"><thead><tr><th>Pos</th>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${(table.values || []).map((row) => `<tr class="${String(row.team_id) === String(teamId) ? 'is-outwoods' : ''}"><td>${esc(row.position)}</td>${columns.map(([key]) => `<td>${esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function statsHtml(data, teamNameValue) {
    const teamStats = data.statsByTeam?.[teamNameValue] || data.stats || {};
    const filterPlayer = (row) => row.name;
    const batting = (teamStats.batting || []).filter(filterPlayer).slice(0, 5);
    const bowling = (teamStats.bowling || []).filter(filterPlayer).slice(0, 5);
    if (!batting.length && !bowling.length) return '<div class="cricket-empty"><h3>Season statistics unavailable</h3><p>Batting and bowling leaders will appear once scorecards are available.</p></div>';
    return `<div class="stats-grid"><div><span class="match-eyebrow">Batting leaders</span>${batting.map((p, i) => `<div class="stat-row"><span><b>${i + 1}</b>${esc(p.name)}</span><strong>${esc(p.runs)} runs</strong></div>`).join('')}</div><div><span class="match-eyebrow">Bowling leaders</span>${bowling.map((p, i) => `<div class="stat-row"><span><b>${i + 1}</b>${esc(p.name)}</span><strong>${esc(p.wickets)} wickets</strong></div>`).join('')}</div></div><p class="data-note">Club figures calculated from published ${esc(teamNameValue)} scorecards.</p>`;
  }

  function renderHub(data) {
    const hub = document.querySelector('[data-cricket-hub]');
    const content = document.querySelector('[data-cricket-content]');
    if (!hub || !content) return;
    const buttons = [...hub.querySelectorAll('[data-team]')];
    let selected = localStorage.getItem('outwoods-cricket-team') || '1st XI';
    if (!buttons.some((button) => button.dataset.team === selected)) selected = '1st XI';

    const draw = () => {
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.team === selected)));
      const team = (data.teams || []).find((item) => item.name === selected) || { id: selected, name: selected };
      const fixtures = (data.fixtures || []).filter((m) => m.team === selected);
      const results = (data.results || []).filter((m) => m.team === selected);
      content.innerHTML = `<div class="cricket-now">${fixtures[0] ? fixtureCard(fixtures[0], true) : nextEmpty(data.season)}${results[0] ? resultCard(results[0], data, true) : '<article class="match-card match-card-empty"><span class="match-eyebrow">Latest result</span><h3>No result available.</h3><p>Results will appear once published.</p></article>'}</div>
        <div class="cricket-tabs" role="tablist" aria-label="Cricket information"><button role="tab" aria-selected="true" data-panel="fixtures">Fixtures</button><button role="tab" aria-selected="false" data-panel="results">Results</button><button role="tab" aria-selected="false" data-panel="table">Table</button><button role="tab" aria-selected="false" data-panel="stats">Stats</button></div>
        <div class="cricket-panel" data-panel-content>
          <div data-view="fixtures">${fixtures.length ? `<div class="match-list">${fixtures.map((m) => fixtureCard(m)).join('')}</div>` : nextEmpty(data.season)}</div>
          <div data-view="results" hidden>${results.length ? `<div class="match-list">${results.map((m) => resultCard(m, data)).join('')}</div>` : '<div class="cricket-empty"><h3>No results available</h3><p>Published results will appear here automatically.</p></div>'}</div>
          <div data-view="table" hidden>${tableHtml(data, team.id)}</div>
          <div data-view="stats" hidden>${statsHtml(data, selected)}</div>
        </div>`;
      const tabs = [...content.querySelectorAll('[role="tab"]')];
      tabs.forEach((tab) => tab.addEventListener('click', () => {
        tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
        content.querySelectorAll('[data-view]').forEach((view) => { view.hidden = view.dataset.view !== tab.dataset.panel; });
      }));
    };
    buttons.forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.team;
      localStorage.setItem('outwoods-cricket-team', selected);
      draw();
    }));
    draw();
  }

  const inningsTable = (innings) => `<section class="innings-card"><div class="innings-heading"><h2>${esc(innings.team)}</h2><strong>${esc(innings.score)}</strong><span>${esc(innings.overs)} overs</span></div>
    <div class="score-table-wrap"><table class="score-table batting-table"><thead><tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead><tbody>${innings.batters.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.dismissal || 'not out')}</td><td><b>${esc(p.runs)}</b></td><td>${esc(p.balls)}</td><td>${esc(p.fours)}</td><td>${esc(p.sixes)}</td></tr>`).join('')}<tr class="extras-row"><td>Extras</td><td></td><td><b>${esc(innings.extras)}</b></td><td colspan="3"></td></tr></tbody></table></div>
    <div class="score-table-wrap"><table class="score-table bowling-table"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Wd</th><th>NB</th></tr></thead><tbody>${innings.bowlers.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.overs)}</td><td>${esc(p.maidens)}</td><td>${esc(p.runs)}</td><td><b>${esc(p.wickets)}</b></td><td>${esc(p.wides)}</td><td>${esc(p.noBalls)}</td></tr>`).join('')}</tbody></table></div></section>`;

  function renderScorecard(data) {
    const target = document.querySelector('[data-scorecard-content]');
    if (!target) return;
    const id = new URLSearchParams(location.search).get('id');
    const match = data.matches && data.matches[id];
    if (!match) {
      target.innerHTML = `<div class="scorecard-missing"><h1>Scorecard unavailable.</h1><p>This match may not have a full scorecard on Play-Cricket yet.</p><a class="btn" href="${PLAY_CRICKET}">View Play-Cricket</a></div>`;
      return;
    }
    document.title = `${match.home.club} v ${match.away.club} | Outwoods scorecard`;
    const mark = outcome(match);
    target.innerHTML = `<header class="scorecard-hero"><span class="match-eyebrow">${esc(match.competition)}</span><h1>${esc(match.resultDescription || 'Match result')}</h1><p>${esc(dateText(match.date, true))}${match.ground ? ` · ${esc(match.ground)}` : ''}</p><div class="scorecard-summary"><div><span>${esc(teamName(match.home))}</span><strong>${esc(scoreFor(match, match.home.teamId) || '—')}</strong></div><div class="result-mark result-${mark.toLowerCase()}">${mark}</div><div><span>${esc(teamName(match.away))}</span><strong>${esc(scoreFor(match, match.away.teamId) || '—')}</strong></div></div></header>
      <div class="innings-stack">${match.innings.map(inningsTable).join('')}</div>
      <section class="match-info"><h2>Match info</h2>${match.toss ? `<p><b>Toss</b><span>${esc(match.toss)}</span></p>` : ''}<p><b>Competition</b><span>${esc(match.league)}${match.competition ? ` · ${esc(match.competition)}` : ''}</span></p><p><b>Venue</b><span>${esc(match.ground || 'Not listed')}</span></p><a class="text-link" href="${esc(match.playCricketUrl)}" target="_blank" rel="noreferrer">View original on Play-Cricket</a></section>`;
  }

  if (document.querySelector('[data-cricket-home], [data-cricket-hub], [data-scorecard]')) {
    fetch(DATA_URL, { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('Cricket data unavailable');
      return response.json();
    }).then((data) => { renderHome(data); renderHub(data); renderScorecard(data); }).catch(() => {
      document.querySelectorAll('.cricket-loading').forEach((node) => { node.innerHTML = `Cricket updates are temporarily unavailable. <a class="text-link" href="${PLAY_CRICKET}">View Play-Cricket</a>`; });
    });
  }
})();
