// Live UltroBot status. Asks the status Worker (never the home server) whether UltroBot is awake,
// then sets ub-awake / ub-asleep / ub-unknown on <html> ("offline" from the Worker shows as unknown). CSS handles the robot and every label.
// Everything from the Worker is treated as data: only known fields are read, and text goes in with textContent.
(function () {
  'use strict';

  const root = document.documentElement;
  const pill = document.querySelector('[data-ub-pill]');
  const url = pill ? pill.dataset.statusUrl : '';
  const CACHE_KEY = 'ultrobot-status';
  const STAGES = ['outline', 'script', 'facts', 'voice', 'render'];
  const STAGE_TEXT = { done: 'Done', doing: 'In progress', todo: 'Next' };
  const LANES = { claude: 'Claude', copilot: 'Copilot', diego: 'Diego' };

  function setState(state) {
    root.classList.remove('ub-awake', 'ub-asleep', 'ub-unknown');
    root.classList.add('ub-' + state);
    if (pill) {
      pill.setAttribute('aria-label', state === 'awake' ? 'UltroLab Server is on' : state === 'asleep' ? 'UltroLab Server is sleeping' : 'UltroLab Server is offline');
    }
  }

  const cache = {
    read() {
      try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
    },
    write(v) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* private mode */ }
    },
  };

  function fmtNumber(n) {
    return Number.isFinite(n) && n >= 0 ? Math.round(n).toLocaleString('en-US') : '—';
  }
  function fmtDuration(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '—';
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${Math.max(1, m)}m`;
  }
  function fmtAgo(epochSec) {
    if (!Number.isFinite(epochSec) || epochSec <= 0) return '—';
    const s = Math.max(0, Date.now() / 1000 - epochSec);
    if (s < 90) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
  }
  function fmtDate(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function set(name, text) {
    document.querySelectorAll(`[data-ub="${name}"]`).forEach(el => { el.textContent = text; });
  }

  function render(data, latencyMs) {
    const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
    set('tasks_done', fmtNumber(stats.tasks_done));
    set('scripts_drafted', fmtNumber(stats.scripts_drafted));
    set('uptime', data.state === 'awake' ? fmtDuration(stats.uptime_s) : '—');
    set('last_seen', data.state === 'awake' ? 'right now' : fmtAgo(data.last_seen));
    if (Number.isFinite(latencyMs)) set('latency', `${Math.round(latencyMs)} ms`);

    const studio = data.studio && typeof data.studio === 'object' ? data.studio : null;
    if (studio) {
      let score = 0;
      STAGES.forEach(stage => {
        const v = STAGE_TEXT[studio[stage]] ? studio[stage] : 'todo';
        if (v === 'done') score += 1;
        document.querySelectorAll(`[data-step="${stage}"]`).forEach(el => {
          el.dataset.state = v;
          const st = el.querySelector('.st');
          if (st) st.textContent = STAGE_TEXT[v];
        });
      });
      document.querySelectorAll('[data-ub-bar]').forEach(bar => { bar.className = 'w-' + score; });
    }

    const feed = document.querySelector('[data-ub-feed]');
    if (feed && Array.isArray(data.shipped) && data.shipped.length) {
      const items = data.shipped.slice(0, 6).filter(c => c && typeof c.title === 'string');
      if (items.length) {
        feed.textContent = '';
        items.forEach(c => {
          const li = document.createElement('li');
          const lane = document.createElement('span');
          const laneKey = LANES[c.lane] ? c.lane : 'diego';
          lane.className = 'lane ' + laneKey;
          lane.textContent = LANES[laneKey];
          const title = document.createElement('span');
          title.textContent = c.title.slice(0, 90);
          const time = document.createElement('time');
          time.textContent = fmtDate(c.date);
          if (fmtDate(c.date)) time.dateTime = c.date;
          li.append(lane, title, time);
          feed.append(li);
        });
      }
    }
  }

  // Stars for the night-sky hero
  document.querySelectorAll('.stars').forEach(box => {
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 70; i++) {
      const star = document.createElement('i');
      star.style.left = (rnd() * 100) + '%';
      star.style.top = (rnd() * 100) + '%';
      star.style.animationDelay = (rnd() * 3).toFixed(2) + 's';
      star.style.opacity = (0.35 + rnd() * 0.65).toFixed(2);
      box.append(star);
    }
  });

  // First paint: last known answer if it's fresh, so the pill doesn't flash.
  const cached = cache.read();
  if (cached && cached.data && Date.now() - cached.at < 10 * 60 * 1000) {
    setState(cached.data.state === 'awake' || cached.data.state === 'asleep' ? cached.data.state : 'unknown');
    render(cached.data);
  } else {
    setState('unknown');
    if (cached && cached.data) render(cached.data);
  }

  if (!url || !/^https:\/\//.test(url)) return;

  let inFlight = false;
  async function check() {
    if (inFlight || document.visibilityState === 'hidden') return;
    inFlight = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const started = performance.now();
    try {
      const resp = await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!resp.ok) throw new Error('status ' + resp.status);
      const data = await resp.json();
      if (!data || !['awake', 'asleep', 'offline'].includes(data.state)) throw new Error('bad shape');
      setState(data.state === 'offline' ? 'unknown' : data.state);
      render(data, performance.now() - started);
      cache.write({ at: Date.now(), data });
    } catch {
      setState('unknown');
    } finally {
      clearTimeout(timer);
      inFlight = false;
    }
  }

  check();
  setInterval(check, 2 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
})();
