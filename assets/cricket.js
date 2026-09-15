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
  const weekKey = (value) => {
    const d = parseDate(value);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const fixtureRound = (matches = [], latest = false) => {
    if (!matches.length) return [];
    const anchor = matches[0];
    const key = weekKey(anchor.date);
    return matches.filter((match) => weekKey(match.date) === key).sort((a, b) => {
      const teamOrder = (name) => name.includes('1st') ? 1 : name.includes('2nd') ? 2 : 3;
      return teamOrder(a.team) - teamOrder(b.team);
    });
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
    if (match.result === 'W' || match.result === 'CON') return won ? 'W' : 'L';
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
    return `<article class="match-card match-card-empty"><span class="match-eyebrow">Between seasons</span><h3>That’s stumps for ${year}.</h3><p>${next} fixtures will appear here when published.</p><a class="text-link" href="${PLAY_CRICKET}" target="_blank" rel="noreferrer">Play-Cricket</a></article>`;
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
      <div class="match-card-top"><span class="match-eyebrow">Last time out</span><span class="match-card-tags"><span class="team-pill">${esc(match.team)}</span><span class="result-mark result-${mark.toLowerCase()}">${mark}</span></span></div>
      <p class="match-date">${esc(dateText(match.date))}</p>
      <div class="score-lines"><div><strong>Outwoods</strong><b>${esc(scores.own)}</b></div><div><span>${esc(opponent(match).club)}</span><b>${esc(scores.other)}</b></div></div>
      <p class="result-description">${esc(match.resultDescription || 'Result recorded on Play-Cricket')}</p>
      <a class="text-link" href="${esc(href)}"${external}>View scorecard</a>
    </article>`;
  };

  function renderHome(data) {
    const grid = document.querySelector('[data-home-match-grid]');
    if (!grid) return;
    const next = fixtureRound(data.fixtures || []);
    const latest = fixtureRound(data.results || [], true);
    grid.innerHTML = `<section class="home-round"><h3>Next fixtures</h3><div class="round-card-grid">${next.length ? next.map((match) => fixtureCard(match, true)).join('') : nextEmpty(data.season)}</div></section>
      <section class="home-round"><h3>Latest results</h3><div class="round-card-grid">${latest.length ? latest.map((match) => resultCard(match, data, true)).join('') : '<article class="match-card match-card-empty"><span class="match-eyebrow">Latest results</span><h3>No results available.</h3></article>'}</div></section>`;
  }

  function singleTableHtml(data, teamId) {
    const table = (data.tables || []).filter((item) => (item.values || []).some((row) => String(row.team_id) === String(teamId))).sort((a, b) => Number(b.season || 0) - Number(a.season || 0))[0];
    if (!table) return '<div class="cricket-empty"><h3>League table unavailable</h3><p>The new table will appear once the competition is published on Play-Cricket.</p></div>';
    const headings = table.headings || {};
    const entries = Object.entries(headings);
    const wanted = entries.filter(([, label]) => /^(team|p|w|l|pts)$/i.test(String(label).trim()));
    const columns = wanted.length >= 3 ? wanted : entries.slice(0, 5);
    return `<div class="table-title"><div><span class="match-eyebrow">${esc(table.season || '')} season</span><h3>${esc(table.name || 'League table')}</h3></div></div><div class="league-table-wrap"><table class="league-table"><thead><tr><th>Pos</th>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${(table.values || []).map((row) => `<tr class="${String(row.team_id) === String(teamId) ? 'is-outwoods' : ''}"><td>${esc(row.position)}</td>${columns.map(([key]) => `<td>${esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function tableHtml(data, teams) {
    const usable = teams.filter((team) => team && team.id);
    if (!usable.length) return '<div class="cricket-empty"><h3>League table unavailable</h3></div>';
    return `<div class="tables-stack">${usable.map((team) => `<section>${usable.length > 1 ? `<h2 class="team-section-title">${esc(team.name)}</h2>` : ''}${singleTableHtml(data, team.id)}</section>`).join('')}</div>`;
  }

  function historyHtml(data, teamFilter) {
    const rows = (data.seasonPositions || []).filter((row) => teamFilter === 'All' || row.team === teamFilter);
    if (!rows.length) return '<div class="cricket-empty"><h3>Past positions unavailable</h3><p>Historical finishes will appear where Play-Cricket has published league tables.</p></div>';
    const ordinal = (position) => `${esc(position)}${/1$/.test(position) && !/11$/.test(position) ? 'st' : /2$/.test(position) && !/12$/.test(position) ? 'nd' : /3$/.test(position) && !/13$/.test(position) ? 'rd' : 'th'}`;
    if (teamFilter !== 'All') {
      return `<div class="history-grid">${rows.map((row) => `<article class="history-card"><span>${esc(row.season)}</span><strong>${ordinal(row.position)}</strong><div><span class="team-pill">${esc(row.team)}</span></div><p>${esc(row.division)}</p></article>`).join('')}</div>`;
    }
    const seasons = [...new Set(rows.map((row) => row.season))].sort((a, b) => b - a);
    return `<div class="history-seasons">${seasons.map((season) => {
      const seasonRows = rows.filter((row) => row.season === season).sort((a, b) => a.team.localeCompare(b.team));
      return `<article class="history-season"><header><span class="match-eyebrow">Season</span><h2>${esc(season)}</h2></header><div class="history-team-grid">${seasonRows.map((row) => `<div class="history-team"><span class="team-pill">${esc(row.team)}</span><strong>${ordinal(row.position)}</strong><p>${esc(row.division)}</p></div>`).join('')}</div></article>`;
    }).join('')}</div>`;
  }

  function statsHtml(data, teamNameValue) {
    if (teamNameValue === 'All' && (data.teams || []).length) {
      return `<div class="team-data-stack">${data.teams.map((team) => `<section><h2 class="team-section-title"><span class="team-pill">${esc(team.name)}</span></h2>${statsHtml(data, team.name)}</section>`).join('')}</div>`;
    }
    const teamStats = data.statsByTeam?.[teamNameValue] || data.stats || {};
    const filterPlayer = (row) => row.name;
    const batting = (teamStats.batting || []).filter(filterPlayer);
    const bowling = (teamStats.bowling || []).filter(filterPlayer);
    const fielding = (teamStats.fielding || []).filter(filterPlayer);
    if (!batting.length && !bowling.length) return '<div class="cricket-empty"><h3>Season statistics unavailable</h3><p>Player figures will appear once scorecards are available.</p></div>';
    const cell = (value) => esc(value ?? '—');
    const sortHead = (label, key) => `<th><button type="button" data-sort-key="${key}">${label}<span aria-hidden="true"></span></button></th>`;
    const statCell = (label, key, value, display = value, strong = false) => `<td data-label="${label}" data-stat="${key}" data-value="${cell(value)}">${strong ? `<b>${cell(display)}</b>` : cell(display)}</td>`;
    const sortSelect = (options, selected) => `<label class="stats-sort-control"><span>Sort by</span><select data-stats-sort>${options.map(([key, label]) => `<option value="${key}"${key === selected ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
    const battingOptions = [['runs', 'Runs'], ['average', 'Average'], ['strikeRate', 'Strike rate'], ['highScore', 'Highest score'], ['fifties', 'Fifties'], ['hundreds', 'Hundreds'], ['innings', 'Innings'], ['name', 'Player']];
    const bowlingOptions = [['wickets', 'Wickets'], ['average', 'Average'], ['economy', 'Economy'], ['strikeRate', 'Strike rate'], ['bestValue', 'Best figures'], ['overs', 'Overs'], ['innings', 'Innings'], ['name', 'Player']];
    const fieldingOptions = [['catches', 'Catches'], ['stumpings', 'Stumpings'], ['runOuts', 'Run-outs'], ['name', 'Player']];
    const battingTable = `<section class="stats-section"><div class="stats-heading"><div><span class="match-eyebrow">Batting</span><h3>Season batting</h3></div>${sortSelect(battingOptions, 'runs')}</div><div class="stats-table-wrap"><table class="stats-table" data-default-sort="runs"><thead><tr>${sortHead('Player', 'name')}${sortHead('Inn', 'innings')}${sortHead('Runs', 'runs')}${sortHead('HS', 'highScore')}${sortHead('Avg', 'average')}${sortHead('SR', 'strikeRate')}${sortHead('50', 'fifties')}${sortHead('100', 'hundreds')}</tr></thead><tbody>${batting.map((p) => `<tr>${statCell('Player', 'name', p.name)}${statCell('Innings', 'innings', p.innings)}${statCell('Runs', 'runs', p.runs, p.runs, true)}${statCell('Highest score', 'highScore', p.highScore, p.highScoreDisplay ?? p.highScore)}${statCell('Average', 'average', p.average)}${statCell('Strike rate', 'strikeRate', p.strikeRate)}${statCell('50s', 'fifties', p.fifties)}${statCell('100s', 'hundreds', p.hundreds)}</tr>`).join('')}</tbody></table></div></section>`;
    const bowlingTable = `<section class="stats-section"><div class="stats-heading"><div><span class="match-eyebrow">Bowling</span><h3>Season bowling</h3></div>${sortSelect(bowlingOptions, 'wickets')}</div><div class="stats-table-wrap"><table class="stats-table" data-default-sort="wickets"><thead><tr>${sortHead('Player', 'name')}${sortHead('Inn', 'innings')}${sortHead('Overs', 'overs')}${sortHead('Wkts', 'wickets')}${sortHead('BBI', 'bestValue')}${sortHead('Avg', 'average')}${sortHead('Econ', 'economy')}${sortHead('SR', 'strikeRate')}</tr></thead><tbody>${bowling.map((p) => { const parts = String(p.best || '0/9999').split('/').map(Number); const bestValue = (parts[0] || 0) * 10000 - (parts[1] || 9999); return `<tr>${statCell('Player', 'name', p.name)}${statCell('Innings', 'innings', p.innings)}${statCell('Overs', 'overs', p.overs)}${statCell('Wickets', 'wickets', p.wickets, p.wickets, true)}${statCell('Best figures', 'bestValue', bestValue, p.best)}${statCell('Average', 'average', p.average)}${statCell('Economy', 'economy', p.economy)}${statCell('Strike rate', 'strikeRate', p.strikeRate)}</tr>`; }).join('')}</tbody></table></div></section>`;
    const fieldingTable = fielding.length ? `<section class="stats-section"><div class="stats-heading"><div><span class="match-eyebrow">Fielding</span><h3>Season fielding</h3></div>${sortSelect(fieldingOptions, 'catches')}</div><div class="stats-table-wrap"><table class="stats-table stats-table-fielding" data-default-sort="catches"><thead><tr>${sortHead('Player', 'name')}${sortHead('Catches', 'catches')}${sortHead('Stumpings', 'stumpings')}${sortHead('Run-outs', 'runOuts')}</tr></thead><tbody>${fielding.map((p) => `<tr>${statCell('Player', 'name', p.name)}${statCell('Catches', 'catches', p.catches, p.catches, true)}${statCell('Stumpings', 'stumpings', p.stumpings)}${statCell('Run-outs', 'runOuts', p.runOuts)}</tr>`).join('')}</tbody></table></div></section>` : '';
    return `<div class="season-stats">${battingTable}${bowlingTable}${fieldingTable}</div><p class="data-note">Calculated from published ${esc(teamNameValue)} scorecards. Averages use recorded dismissals.</p>`;
  }

  function setupStatsSorting(root) {
    root.querySelectorAll('.stats-section').forEach((section) => {
      const table = section.querySelector('.stats-table');
      const body = table?.tBodies[0];
      if (!table || !body) return;
      let activeKey = table.dataset.defaultSort;
      let direction = 'desc';
      const sortRows = (key, nextDirection) => {
        activeKey = key;
        direction = nextDirection;
        const rows = [...body.rows];
        rows.sort((a, b) => {
          const av = a.querySelector(`[data-stat="${key}"]`)?.dataset.value ?? '';
          const bv = b.querySelector(`[data-stat="${key}"]`)?.dataset.value ?? '';
          const an = Number(av); const bn = Number(bv);
          const aMissing = av === '' || av === '—'; const bMissing = bv === '' || bv === '—';
          if (aMissing !== bMissing) return aMissing ? 1 : -1;
          const comparison = !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : av.localeCompare(bv);
          return direction === 'asc' ? comparison : -comparison;
        });
        rows.forEach((row) => body.appendChild(row));
        table.querySelectorAll('[data-sort-key]').forEach((button) => {
          const current = button.dataset.sortKey === key;
          button.closest('th').setAttribute('aria-sort', current ? (direction === 'asc' ? 'ascending' : 'descending') : 'none');
          button.querySelector('span').textContent = current ? (direction === 'asc' ? ' ↑' : ' ↓') : '';
        });
        const select = section.querySelector('[data-stats-sort]');
        if (select) select.value = key;
      };
      table.querySelectorAll('[data-sort-key]').forEach((button) => button.addEventListener('click', () => {
        const key = button.dataset.sortKey;
        sortRows(key, activeKey === key && direction === 'desc' ? 'asc' : 'desc');
      }));
      section.querySelector('[data-stats-sort]')?.addEventListener('change', (event) => sortRows(event.target.value, event.target.value === 'name' ? 'asc' : 'desc'));
      sortRows(activeKey, direction);
    });
  }

  function renderHub(data) {
    const hub = document.querySelector('[data-cricket-hub]');
    const content = document.querySelector('[data-cricket-content]');
    if (!hub || !content) return;
    const buttons = [...hub.querySelectorAll('[data-team]')];
    const tabs = [...hub.querySelectorAll('.hero-tabs [role="tab"]')];
    let selected = localStorage.getItem('outwoods-cricket-team') || 'All';
    if (!buttons.some((button) => button.dataset.team === selected)) selected = 'All';
    let activePanel = (data.fixtures || []).length ? 'fixtures' : 'table';

    const setPanel = (panel) => {
      activePanel = panel;
      tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.panel === panel)));
      content.querySelectorAll('[data-view]').forEach((view) => { view.hidden = view.dataset.view !== panel; });
    };

    const draw = () => {
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.team === selected)));
      const selectedTeams = selected === 'All' ? (data.teams || []) : (data.teams || []).filter((item) => item.name === selected);
      const fixtures = (data.fixtures || []).filter((m) => selected === 'All' || m.team === selected);
      const results = (data.results || []).filter((m) => selected === 'All' || m.team === selected);
      const roundSource = (data.fixtures || []).filter((m) => selected === 'All' || m.team === selected);
      const nextRound = fixtureRound(roundSource);
      const year = Number(data.season) || new Date().getFullYear();
      const nextYear = Math.max(year + 1, new Date().getFullYear() + 1);
      const hasTable = selectedTeams.some((team) => (data.tables || []).some((table) => (table.values || []).some((row) => String(row.team_id) === String(team.id))));
      const currentStatus = nextRound.length
        ? `<section class="current-status is-active"><div><span class="status-kicker">Next round</span><h2>${esc(dateText(nextRound[0].date))}</h2></div><div class="status-fixtures">${nextRound.map((match) => `<a href="${esc(match.playCricketUrl)}" target="_blank" rel="noreferrer"><b>${esc(match.team)}</b><span>${esc(opponent(match).club)}</span><strong>${esc(match.time || 'TBC')}</strong></a>`).join('')}</div></section>`
        : `<section class="current-status"><div><span class="status-kicker">Season complete</span><h2>${year} is in the books.</h2><p>${nextYear} fixtures will appear here when published.</p></div>${hasTable ? `<button class="status-action" type="button" data-open-table>See ${year} final table</button>` : `<a class="status-action" href="${PLAY_CRICKET}" target="_blank" rel="noreferrer">Play-Cricket</a>`}</section>`;
      content.innerHTML = `${currentStatus}<div class="cricket-panel" data-panel-content>
          <div data-view="fixtures">${fixtures.length ? `<div class="match-list">${fixtures.map((m) => fixtureCard(m)).join('')}</div>` : '<div class="cricket-empty cricket-empty-compact"><h3>No upcoming fixtures</h3><p>The new schedule has not been published yet.</p></div>'}</div>
          <div data-view="results" hidden>${results.length ? `<div class="match-list">${results.map((m) => resultCard(m, data)).join('')}</div>` : '<div class="cricket-empty"><h3>No results available</h3><p>Published results will appear here automatically.</p></div>'}</div>
          <div data-view="table" hidden>${tableHtml(data, selectedTeams)}</div>
          <div data-view="stats" hidden>${statsHtml(data, selected)}</div>
          <div data-view="history" hidden>${historyHtml(data, selected)}</div>
        </div>`;
      const tableButton = content.querySelector('[data-open-table]');
      if (tableButton) tableButton.addEventListener('click', () => setPanel('table'));
      setupStatsSorting(content);
      setPanel(activePanel);
    };
    buttons.forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.team;
      localStorage.setItem('outwoods-cricket-team', selected);
      draw();
    }));
    tabs.forEach((tab) => tab.addEventListener('click', () => setPanel(tab.dataset.panel)));
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
