// Mockup helper: draws icons and the robot, and switches between awake and asleep.
// The shipped site will use the real status check described in docs/ULTROBOT_STATUS.md.
(function () {
  'use strict';
  const P = {
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    spark: '<path d="M12 3l1.9 5.8L20 10.7l-6.1 1.9L12 18.5l-1.9-5.9L4 10.7l6.1-1.9z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    branch: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v6M18 9a9 9 0 0 1-9 9"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
  };
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[el.dataset.icon] || '') + '</svg>');
  });

  const BOT = '<svg class="bot" viewBox="0 0 200 180" role="img" aria-label="UltroBot robot">' +
    '<g class="body-g">' +
    '<line class="stem" x1="100" y1="40" x2="100" y2="20"/><circle class="bulb" cx="100" cy="15" r="8"/>' +
    '<rect class="ear" x="16" y="78" width="16" height="32" rx="7"/><rect class="ear" x="168" y="78" width="16" height="32" rx="7"/>' +
    '<rect class="head" x="30" y="38" width="140" height="112" rx="34"/>' +
    '<rect class="visor" x="48" y="62" width="104" height="56" rx="24"/>' +
    '<g class="eyes"><ellipse class="eye" cx="78" cy="90" rx="9" ry="11"/><ellipse class="eye" cx="122" cy="90" rx="9" ry="11"/></g>' +
    '<path class="lid" d="M68 90 Q78 99 88 90"/><path class="lid" d="M112 90 Q122 99 132 90"/>' +
    '<path class="mouth" d="M88 132 Q100 140 112 132"/>' +
    '</g>' +
    '<text class="zz z1" x="150" y="44" font-size="18">z</text>' +
    '<text class="zz z2" x="150" y="44" font-size="24">z</text>' +
    '<text class="zz z3" x="150" y="44" font-size="30">Z</text>' +
    '</svg>';
  document.querySelectorAll('[data-bot]').forEach(el => { el.innerHTML = BOT; });

  // Stars for the night sky
  document.querySelectorAll('.stars').forEach(box => {
    let s = 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 70; i++) {
      const star = document.createElement('i');
      star.style.left = (rnd() * 100) + '%';
      star.style.top = (rnd() * 100) + '%';
      star.style.animationDelay = (rnd() * 3) + 's';
      star.style.opacity = 0.4 + rnd() * 0.6;
      box.appendChild(star);
    }
  });

  const params = new URLSearchParams(location.search);
  const root = document.documentElement;
  if (params.get('theme') === 'dark') root.setAttribute('data-theme', 'dark');
  if (params.has('shot')) root.classList.add('shot');
  function setState(s) {
    root.classList.toggle('awake', s === 'awake');
    root.classList.toggle('asleep', s !== 'awake');
    document.querySelectorAll('.mock-switch button').forEach(b => b.classList.toggle('on', b.dataset.state === s));
    document.querySelectorAll('[data-status-text]').forEach(el => {
      el.textContent = s === 'awake' ? 'UltroBot online' : 'UltroBot sleeping';
    });
  }
  setState(params.get('state') === 'awake' ? 'awake' : 'asleep');
  document.querySelectorAll('.mock-switch button').forEach(b => b.addEventListener('click', () => setState(b.dataset.state)));
  const t = document.getElementById('theme');
  if (t) t.addEventListener('click', () => {
    root.getAttribute('data-theme') === 'dark' ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', 'dark');
  });
})();
