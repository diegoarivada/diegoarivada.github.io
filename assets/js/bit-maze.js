// "Bit Maze": a retro maze chase in the Nap Run world. UltroBot collects data bits in the server room
// while bugs hunt it. Grab a patch (shield) and the bugs turn blue for a few seconds so UltroBot can squash them.
// Needs arcade-kit.js first. Canvas only, so it fits script-src 'self'.
(function () {
  'use strict';
  var A = window.Arcade;
  var canvas = document.getElementById('maze-canvas');
  if (!A || !canvas || !canvas.getContext) return;
  var section = canvas.closest('section');
  function $(n) { return section.querySelectorAll('[data-mz="' + n + '"]'); }
  function setText(n, v) { $(n).forEach(function (e) { e.textContent = v; }); }

  // Left half of the maze plus the center column; the right half is mirrored.
  // # wall, . bit, o patch, - pen gate, G pen, B UltroBot start
  var HALF = [
    '###########', '#o.........', '#.##.###.#.', '#.##.###.#.', '#..........', '#.##.#.####',
    '#....#.....', '####.# ###-', '####.# #GGG', '####.# ####', '#..........', '#.##.###.#.',
    '#o.#......B', '##.#.#.####', '#....#.....', '#.#######..', '#..........', '###########'
  ];
  var MAP = HALF.map(function (r) { return r + r.slice(0, 10).split('').reverse().join(''); });
  var COLS = MAP[0].length, ROWS = MAP.length, T = 20;
  var W = COLS * T, H = ROWS * T;
  var view = A.setup(canvas, W, H), ctx = view.ctx;

  var START = { x: 10, y: 12 }, EXIT = { x: 10, y: 6 };
  var PEN = [{ x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 }];
  var DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
  var BUGS = [
    { body: '#e63946', legs: '#f0717f', name: 'chaser' },
    { body: '#f0b45a', legs: '#ffd59a', name: 'ambusher' },
    { body: '#d94fa0', legs: '#f59ad0', name: 'wanderer' },
    { body: '#2a9d8f', legs: '#6ee7d8', name: 'shy' }
  ];

  var KEY = 'bitMazeBest', best = A.loadBest(KEY);
  var state = 'ready'; // ready | play | paused | dying | clear | over
  var grid, bitsLeft, score, lives, level, bot, bugs, scaredFor, combo, t, stateT, last = 0, raf = 0, pops;

  function wall(x, y) { var r = MAP[y]; return !r || r[x] === undefined || r[x] === '#' || r[x] === 'G' || r[x] === '-'; }

  function resetBoard() {
    grid = MAP.map(function (r) { return r.split('').map(function (c) { return c === '.' ? 1 : c === 'o' ? 2 : 0; }); });
    bitsLeft = 0;
    grid.forEach(function (r) { r.forEach(function (c) { if (c) bitsLeft++; }); });
  }
  function resetActors() {
    bot = { tx: START.x, ty: START.y, dx: 0, dy: 0, p: 0, want: null, face: 0 };
    bugs = BUGS.map(function (b, i) {
      return { tx: PEN[i].x, ty: PEN[i].y, dx: 0, dy: 0, p: 0, home: true, release: 1 + i * 2.6, look: b, seed: i * 1.7, eaten: 0 };
    });
    scaredFor = 0; combo = 0; pops = [];
  }
  function newGame() {
    score = 0; lives = 3; level = 1; t = 0;
    resetBoard(); resetActors(); hud();
    state = 'play'; stateT = 0;
  }

  function botSpeed() { return 6.2 + level * 0.15; }
  function bugSpeed(b) { return b.eaten ? 0 : scaredFor > 0 ? 3.4 : Math.min(4.6 + level * 0.35, 6.4); }

  function pos(e) { return { x: e.tx + e.dx * e.p, y: e.ty + e.dy * e.p }; }

  function moveBot(dt) {
    var go = botSpeed() * dt;
    var w = bot.want;
    // Turning around is allowed any time.
    if (w && w[0] === -bot.dx && w[1] === -bot.dy && (bot.dx || bot.dy)) {
      bot.tx += bot.dx; bot.ty += bot.dy; bot.dx = w[0]; bot.dy = w[1]; bot.p = 1 - bot.p;
    }
    if (!bot.dx && !bot.dy) decideBot();
    while (go > 0 && (bot.dx || bot.dy)) {
      var step = Math.min(go, 1 - bot.p);
      bot.p += step; go -= step;
      if (bot.p >= 1 - 1e-6) { bot.tx += bot.dx; bot.ty += bot.dy; bot.p = 0; eat(bot.tx, bot.ty); decideBot(); }
    }
    if (bot.dx) bot.face = bot.dx;
  }
  function decideBot() {
    var w = bot.want;
    if (w && !wall(bot.tx + w[0], bot.ty + w[1])) { bot.dx = w[0]; bot.dy = w[1]; return; }
    if (wall(bot.tx + bot.dx, bot.ty + bot.dy)) { bot.dx = 0; bot.dy = 0; bot.p = 0; }
  }

  function eat(x, y) {
    var c = grid[y][x];
    if (!c) return;
    grid[y][x] = 0; bitsLeft--;
    if (c === 1) score += 10;
    else { score += 50; scaredFor = Math.max(3, 7 - level * 0.6); combo = 0; bugs.forEach(function (b) { if (!b.home) { b.dx = -b.dx; b.dy = -b.dy; b.p = b.dx || b.dy ? 1 - b.p : 0; if (b.dx || b.dy) { b.tx -= b.dx; b.ty -= b.dy; } } }); }
    hud();
    if (bitsLeft <= 0) { state = 'clear'; stateT = 0; say('Level ' + level + ' cleared.'); }
  }

  function target(b, i) {
    var bp = { x: bot.tx, y: bot.ty };
    if (i === 1) return { x: bp.x + bot.dx * 4, y: bp.y + bot.dy * 4 };
    if (i === 2) return Math.sin(t * 0.7 + b.seed) > 0 ? bp : { x: (b.seed * 997 + Math.floor(t / 4) * 7) % COLS, y: (Math.floor(t / 4) * 5) % ROWS };
    if (i === 3) { var d = Math.hypot(b.tx - bp.x, b.ty - bp.y); return d > 7 ? bp : { x: 1, y: ROWS - 2 }; }
    return bp;
  }
  function decideBug(b, i) {
    var opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) {
      return !wall(b.tx + d[0], b.ty + d[1]) && !(d[0] === -b.dx && d[1] === -b.dy && (b.dx || b.dy));
    });
    if (!opts.length) { b.dx = -b.dx; b.dy = -b.dy; return; }
    var pick;
    if (scaredFor > 0 || Math.random() < 0.12) pick = opts[Math.floor(Math.random() * opts.length)];
    else {
      var tg = target(b, i), bestD = Infinity;
      opts.forEach(function (d) { var dd = Math.hypot(b.tx + d[0] - tg.x, b.ty + d[1] - tg.y); if (dd < bestD) { bestD = dd; pick = d; } });
    }
    b.dx = pick[0]; b.dy = pick[1];
  }
  function moveBugs(dt) {
    bugs.forEach(function (b, i) {
      if (b.home) {
        b.release -= dt;
        if (b.release <= 0) { b.home = false; b.tx = EXIT.x; b.ty = EXIT.y; b.p = 0; b.dx = 0; b.dy = 0; b.eaten = 0; decideBug(b, i); }
        return;
      }
      var go = bugSpeed(b) * dt;
      while (go > 0) {
        var step = Math.min(go, 1 - b.p);
        b.p += step; go -= step;
        if (b.p >= 1 - 1e-6) { b.tx += b.dx; b.ty += b.dy; b.p = 0; decideBug(b, i); }
      }
    });
  }

  function collide() {
    var a = pos(bot);
    for (var i = 0; i < bugs.length; i++) {
      var b = bugs[i];
      if (b.home) continue;
      var q = pos(b);
      if (Math.abs(a.x - q.x) + Math.abs(a.y - q.y) < 0.75) {
        if (scaredFor > 0) {
          combo++; var pts = 100 * Math.pow(2, combo);
          score += pts; hud();
          pops.push({ x: q.x, y: q.y, txt: '+' + pts, a: 1 });
          b.home = true; b.tx = PEN[i].x; b.ty = PEN[i].y; b.release = 2.5;
        } else {
          lives--; hud();
          state = lives > 0 ? 'dying' : 'over'; stateT = 0;
          if (state === 'over') {
            if (score > best) { best = score; A.saveBest(KEY, best); }
            hud(); say('Game over. Score ' + score + '.');
          } else say('Caught by a bug. ' + lives + ' lives left.');
          return;
        }
      }
    }
  }

  function update(dt) {
    t += dt; stateT += dt;
    pops.forEach(function (p) { p.y -= dt * 1.5; p.a -= dt; });
    pops = pops.filter(function (p) { return p.a > 0; });
    if (state === 'play') {
      if (scaredFor > 0) scaredFor = Math.max(0, scaredFor - dt);
      moveBot(dt); collide();
      if (state === 'play') { moveBugs(dt); collide(); }
    } else if (state === 'dying' && stateT > 1.4) {
      resetActors(); state = 'play'; stateT = 0;
    } else if (state === 'clear' && stateT > 1.6) {
      level++; resetBoard(); resetActors(); hud(); state = 'play'; stateT = 0;
    }
  }

  // ---------- drawing ----------
  function drawMaze() {
    A.sky(ctx, W, H, t);
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var c = MAP[y][x];
      if (c !== '#') continue;
      var px = x * T, py = y * T;
      ctx.fillStyle = '#101a38'; ctx.fillRect(px, py, T, T);
      // Neon edge only where the wall meets open floor, like Nap Run's server racks.
      ctx.strokeStyle = A.C.neon; ctx.globalAlpha = .85; ctx.beginPath();
      if (!wall(x, y - 1)) { ctx.moveTo(px, py + 1); ctx.lineTo(px + T, py + 1); }
      if (!wall(x, y + 1)) { ctx.moveTo(px, py + T - 1); ctx.lineTo(px + T, py + T - 1); }
      if (!wall(x - 1, y)) { ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + T); }
      if (!wall(x + 1, y)) { ctx.moveTo(px + T - 1, py); ctx.lineTo(px + T - 1, py + T); }
      ctx.stroke(); ctx.globalAlpha = 1;
      // Rack lights on some wall tiles
      if ((x * 7 + y * 3) % 5 === 0 && wall(x, y - 1) && wall(x, y + 1)) {
        var on = A.reduced || Math.sin(t * 6 + x + y) > 0;
        ctx.fillStyle = on ? A.C.mint : A.C.teal; ctx.fillRect(px + T / 2 - 1.5, py + T / 2 - 1.5, 3, 3);
      }
    }
    // Pen and gate
    ctx.fillStyle = 'rgba(99,148,248,.08)'; ctx.fillRect(8 * T, 8 * T, 5 * T, T);
    ctx.strokeStyle = A.C.pink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(10 * T + 2, 7 * T + T / 2); ctx.lineTo(11 * T - 2, 7 * T + T / 2); ctx.stroke();
    // Bits and patches
    for (var yy = 0; yy < ROWS; yy++) for (var xx = 0; xx < COLS; xx++) {
      var g = grid[yy][xx], cx = xx * T + T / 2, cy = yy * T + T / 2;
      if (g === 1) { ctx.fillStyle = A.C.ice; ctx.fillRect(cx - 2, cy - 2, 4, 4); }
      else if (g === 2) drawPatch(cx, cy);
    }
  }
  function drawPatch(cx, cy) {
    var pulse = A.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 6);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(110,231,216,.22)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.283); ctx.fill();
    ctx.fillStyle = A.C.mint; ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(6, -4.5); ctx.lineTo(6, 0); ctx.quadraticCurveTo(6, 5, 0, 8); ctx.quadraticCurveTo(-6, 5, -6, 0); ctx.lineTo(-6, -4.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.C.navy; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2.5, 0.5); ctx.lineTo(-0.5, 2.5); ctx.lineTo(3, -2); ctx.stroke();
    ctx.restore();
  }
  function draw() {
    drawMaze();
    var blink = scaredFor > 0 && scaredFor < 1.5 && Math.floor(t * 8) % 2 === 0;
    bugs.forEach(function (b, i) {
      var p = pos(b);
      var scared = scaredFor > 0 && !b.home;
      A.bug(ctx, p.x * T + T / 2, p.y * T + T / 2, 19, { t: t, seed: b.seed, body: blink && scared ? '#e7ecf5' : b.look.body, legs: b.look.legs, scared: scared && !blink, flip: b.dx > 0 });
    });
    var bp = pos(bot);
    var dead = state === 'dying' || state === 'over';
    A.bot(ctx, bp.x * T + T / 2, bp.y * T + T / 2 + 1, 18, { t: t, dead: dead, walking: state === 'play' && (bot.dx || bot.dy), face: bot.face });
    ctx.textAlign = 'center'; ctx.font = '700 11px Rubik, sans-serif';
    pops.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = A.C.mint; ctx.fillText(p.txt, p.x * T + T / 2, p.y * T + T / 2); });
    ctx.globalAlpha = 1; ctx.textAlign = 'start';
    if (state === 'ready') A.center(ctx, W, H, 'Bit Maze', A.go + ' to start');
    else if (state === 'paused') A.center(ctx, W, H, 'Paused', A.go + ' to keep going');
    else if (state === 'clear') A.center(ctx, W, H, 'Level ' + level + ' cleared!', 'The bugs are getting faster...');
    else if (state === 'over') A.center(ctx, W, H, 'Game over', 'Score ' + score + ' · ' + A.go + ' to play again');
  }

  // ---------- loop, input, HUD ----------
  function frame(now) {
    raf = 0;
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (state === 'play' || state === 'dying' || state === 'clear') update(dt);
    else t += dt;
    draw();
    if (state !== 'paused' && state !== 'over' && state !== 'ready') raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  function hud() {
    setText('score', A.pad(score || 0)); setText('best', A.pad(best));
    setText('lives', lives === undefined ? 3 : lives); setText('level', level || 1);
  }
  var live = section.querySelector('[data-mz="live"]');
  function say(msg) { if (live) live.textContent = msg; }

  function startOrResume() {
    if (state === 'ready' || state === 'over') { newGame(); say('Bit Maze started. Use the arrow keys.'); }
    else if (state === 'paused') state = 'play';
    kick();
  }
  function pause() { if (state === 'play') { state = 'paused'; draw(); } }
  function steer(d) { bot.want = d; if (state === 'play' && !bot.dx && !bot.dy) decideBot(); }

  canvas.addEventListener('keydown', function (e) {
    if (DIRS[e.code]) { e.preventDefault(); if (state === 'play') steer(DIRS[e.code]); else if (state !== 'dying' && state !== 'clear') { startOrResume(); steer(DIRS[e.code]); } }
    else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (state === 'play') pause(); else startOrResume(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { if (state === 'play') { e.preventDefault(); pause(); } }
  });
  canvas.addEventListener('pointerdown', function (e) {
    canvas.focus({ preventScroll: true });
    sx = e.clientX; sy = e.clientY;
    if (state !== 'play' && state !== 'dying' && state !== 'clear') startOrResume();
  });
  // Swipe to steer on phones
  var sx = 0, sy = 0;
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || !e.buttons && e.pressure === 0) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    steer(Math.abs(dx) > Math.abs(dy) ? [dx > 0 ? 1 : -1, 0] : [0, dy > 0 ? 1 : -1]);
    sx = e.clientX; sy = e.clientY;
  });
  canvas.addEventListener('blur', function (e) { if (!(e.relatedTarget && e.relatedTarget.closest('.arcade-pad'))) pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  A.touchPad(section.querySelector('.arcade-pad'), function (k, down) {
    if (!down) return;
    canvas.focus({ preventScroll: true });
    if (state !== 'play') startOrResume();
    if (DIRS[k]) steer(DIRS[k]);
  });

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { view.fit(); draw(); }) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', function () { view.fit(); draw(); });

  score = 0; lives = 3; level = 1; t = 0;
  resetBoard(); resetActors(); hud();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  draw();
})();
