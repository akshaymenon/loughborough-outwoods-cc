(() => {
  const outcomeLabels = {
    W: 'Win',
    L: 'Loss',
    T: 'Tie',
    D: 'Draw or no result'
  };

  const tidyCard = (card) => {
    if (!(card instanceof HTMLElement) || card.dataset.uiTidied === 'true') return;
    card.dataset.uiTidied = 'true';

    const eyebrow = card.querySelector('.match-eyebrow');
    if (card.classList.contains('result-card') && eyebrow) eyebrow.remove();
    if (!card.classList.contains('result-card') && !card.classList.contains('is-matchday') && eyebrow?.textContent.trim() === 'Next up') eyebrow.remove();

    const mark = card.querySelector('.result-mark');
    if (mark) {
      const label = outcomeLabels[mark.textContent.trim()];
      if (label) {
        mark.setAttribute('aria-label', label);
        mark.setAttribute('title', label);
      }
    }
  };

  const groupMatchList = (list) => {
    if (!(list instanceof HTMLElement) || list.dataset.dateGrouped === 'true') return;
    const cards = [...list.children].filter((node) => node.classList?.contains('match-card'));
    if (!cards.length) return;

    list.dataset.dateGrouped = 'true';
    const fragment = document.createDocumentFragment();
    let groupKey = '';
    let groupCards = null;

    cards.forEach((card) => {
      tidyCard(card);
      const date = card.querySelector('.match-date');
      const raw = date?.textContent.trim() || 'Matches';
      const parts = raw.split(/\s+·\s+/);
      const day = parts.shift() || 'Matches';
      const detail = parts.join(' · ');

      if (day !== groupKey) {
        groupKey = day;
        const group = document.createElement('div');
        group.className = 'match-day-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', day);

        const heading = document.createElement('h2');
        heading.className = 'match-day-heading';
        heading.textContent = day;

        groupCards = document.createElement('div');
        groupCards.className = 'match-day-cards';

        group.append(heading, groupCards);
        fragment.appendChild(group);
      }

      if (date) {
        if (detail) date.textContent = detail;
        else date.remove();
      }
      groupCards.appendChild(card);
    });

    list.replaceChildren(fragment);
  };

  const syncTabState = (tablist) => {
    const tabs = [...tablist.querySelectorAll(':scope > [role="tab"]')];
    tabs.forEach((tab) => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  };

  const enhanceTablist = (tablist) => {
    if (!(tablist instanceof HTMLElement) || tablist.dataset.keyboardTabs === 'true') return;
    tablist.dataset.keyboardTabs = 'true';
    syncTabState(tablist);

    tablist.addEventListener('click', () => queueMicrotask(() => syncTabState(tablist)));
    tablist.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...tablist.querySelectorAll(':scope > [role="tab"]')];
      if (!tabs.length) return;
      const current = Math.max(0, tabs.indexOf(document.activeElement));
      let next = current;
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  };

  const connectMainTabs = (root) => {
    const tablist = root.querySelector('.hero-tabs[role="tablist"]');
    if (!tablist) return;
    enhanceTablist(tablist);

    [...tablist.querySelectorAll('[role="tab"][data-panel]')].forEach((tab) => {
      const name = tab.dataset.panel;
      const panel = root.querySelector(`[data-view="${name}"]`);
      if (!panel) return;
      const tabId = `cricket-tab-${name}`;
      const panelId = `cricket-panel-${name}`;
      tab.id ||= tabId;
      tab.setAttribute('aria-controls', panelId);
      panel.id ||= panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
    });
  };

  const connectStatsTabs = (root) => {
    root.querySelectorAll('.stats-subtabs[role="tablist"]').forEach((tablist) => {
      enhanceTablist(tablist);
      [...tablist.querySelectorAll('[role="tab"][data-stats-tab]')].forEach((tab) => {
        const name = tab.dataset.statsTab;
        const panel = root.querySelector(`[data-stats-view="${name}"]`);
        if (!panel) return;
        const suffix = `${name}-${Math.random().toString(36).slice(2, 7)}`;
        tab.id ||= `stats-tab-${suffix}`;
        panel.id ||= `stats-panel-${suffix}`;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
      });
    });
  };

  const enhance = (root = document) => {
    root.querySelectorAll?.('.result-card, .match-card').forEach(tidyCard);
    root.querySelectorAll?.('main[data-cricket-hub] .match-list').forEach(groupMatchList);
    const hub = document.querySelector('main[data-cricket-hub]');
    if (hub) connectMainTabs(hub);
    connectStatsTabs(document);

    document.querySelectorAll('.scorecard-page .result-mark').forEach((mark) => {
      const label = outcomeLabels[mark.textContent.trim()];
      if (label) {
        mark.setAttribute('aria-label', label);
        mark.setAttribute('title', label);
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.addedNodes.length)) return;
    enhance(document);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance(document);
})();
