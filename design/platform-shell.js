/* Only the design review stage switcher; no Supabase connection, authentication, or writes. */
(() => {
  'use strict';
  const selector = document.getElementById('stage-select');
  const navItems = {
    retreat: document.querySelector('[data-module="retreat"]'),
    music: document.querySelector('[data-module="music"]'),
    speakers: document.querySelector('[data-module="speakers"]'),
    market: document.querySelector('[data-module="market"]')
  };
  const thresholds = { retreat: 1, music: 2, speakers: 3, market: 4 };
  const allowed = new Set(['1','2','3','4']);
  const params = new URLSearchParams(location.search);
  const start = params.get('stage');
  selector.value = allowed.has(start) ? start : '1';
  function applyStage(value) {
    const stage = allowed.has(value) ? Number(value) : 1;
    for (const [key, threshold] of Object.entries(thresholds)) {
      navItems[key].hidden = stage < threshold;
    }
    document.querySelectorAll('[data-stage-min]').forEach(section => {
      section.hidden = stage < Number(section.dataset.stageMin);
    });
    const anchor = location.hash.substring(1);
    const active = Object.entries(navItems).find(([, el]) => el.getAttribute('href') === '#' + anchor && !el.hidden);
    for (const el of Object.values(navItems)) {
      if (active ? el === active[1] : el === navItems.retreat) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    }
  }
  function onNavigate() { applyStage(selector.value); }
  selector.addEventListener('change', () => {
    const next = selector.value;
    const url = new URL(location.href);
    url.searchParams.set('stage', next);
    // The UI demo retains the current preview stage when sharing a link.
    history.replaceState(null, '', url);
    applyStage(next);
  });
  window.addEventListener('hashchange', onNavigate);
  applyStage(selector.value);
})();