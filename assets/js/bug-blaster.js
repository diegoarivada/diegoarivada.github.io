// "Bug Blaster": a retro fixed shooter in the Nap Run world. Waves of bugs, worms, and viruses march
// down toward UltroBot. Shoot them before they reach the firewall, and hit the drifting Z for a bonus.
// Needs arcade-kit.js first. Canvas only, so it fits script-src 'self'.
(function () {
  'use strict';
  var A = window.Arcade;
  var canvas = document.getElementById('blaster-canvas');
  if (!A || !canvas || !canvas.getContext) return;
  var section = canvas.closest('section');
  function setText(n, v) { document.querySelectorAll('[data-bb="' + n + '"]').forEach(function (e) { e.textContent = v; }); }
  // Sound and music (arcade-sound.js). Without that file the game just runs silent.
  var S = window.ArcadeSound || { sfx: function () {}, music: function () {}, stop: function () {}, button: function () {} };

  var W = 420, H = 360, GROUND = H - 22, PY = GROUND - 18;
  var view = A.setup(canvas, W, H), ctx = view.ctx;
  var COLS = 8, ROWS = 4, GX = 38, GY = 28;
  var KINDS = [
    { name: 'virus', pts: 40 },
    { name: 'worm', pts: 30 },
    { name: 'bug', pts: 20 },
    { name: 'bug', pts: 20 }
  ];

  var KEY = 'bugBlasterBest', best = A.loadBest(KEY);
  var state = 'ready'; // ready | play | paused | hit | clear | over
  var score, lives, level, t, stateT, last = 0, raf = 0;
  var px, bolts, cool, foes, fx, fy, fdir, fireIn, packets, walls, zee, zeeIn, pops, sparks;
  var keys = { left: false, right: false, fire: false };

  function newWave() {
    foes = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) foes.push({ r: r, c: c, alive: true, kind: KINDS[r] });
    fx = (W - (COLS - 1) * GX) / 2; fy = 50 + Math.min(level - 1, 5) * 8; fdir = 1;
    bolts = []; packets = []; zee = null; zeeIn = 10 + Math.random() * 8;
    fireIn = 1.5;
  }
  function buildWalls() {
    walls = [];
    for (var b = 0; b < 4; b++) {
      var bx = 44 + b * 98;
      for (var y = 0; y < 4; y++) for (var x = 0; x < 7; x++) {
        if (y === 3 && (x === 2 || x === 3 || x === 4)) continue; // arch
        if (y === 0 && (x === 0 || x === 6)) continue; // rounded top
        walls.push({ x: bx + x * 6, y: GROUND - 70 + y * 5, hp: 2 });
      }
    }
  }
  function newGame() {
    score = 0; lives = 3; level = 1; t = 0;
    px = W / 2; cool = 0; pops = []; sparks = [];
    buildWalls(); newWave(); hud();
    state = 'play'; stateT = 0;
    S.sfx('start'); S.music('blaster');
  }

  function alive() { return foes.filter(function (f) { return f.alive; }); }
  function foePos(f) { return { x: fx + f.c * GX, y: fy + f.r * GY }; }

  function burst(x, y, color) {
    if (A.reduced) return;
    for (var i = 0; i < 8; i++) {
      var a = Math.random() * 6.283, v = 40 + Math.random() * 80;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: .6, c: color });
    }
  }

  function hitWall(x, y, w, h) {
    for (var i = 0; i < walls.length; i++) {
      var c = walls[i];
      if (c.hp > 0 && x < c.x + 6 && x + w > c.x && y < c.y + 5 && y + h > c.y) { c.hp--; return true; }
    }
    return false;
  }

  function update(dt) {
    t += dt; stateT += dt;
    sparks.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.a -= dt; });
    sparks = sparks.filter(function (s) { return s.a > 0; });
    pops.forEach(function (p) { p.y -= 20 * dt; p.a -= dt; });
    pops = pops.filter(function (p) { return p.a > 0; });
    if (state === 'hit') { if (stateT > 1.3) { state = 'play'; stateT = 0; packets = []; S.music('blaster'); } return; }
    if (state === 'clear') { if (stateT > 1.6) { level++; newWave(); hud(); state = 'play'; stateT = 0; S.music('blaster'); } return; }
    if (state !== 'play') return;

    // Player
    var mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    px = Math.max(20, Math.min(W - 20, px + mv * 210 * dt));
    cool -= dt;
    if (keys.fire && cool <= 0 && bolts.length < 2) { bolts.push({ x: px, y: PY - 16 }); cool = 0.3; S.sfx('shoot'); }

    // Bolts
    for (var i = bolts.length - 1; i >= 0; i--) {
      var b = bolts[i]; b.y -= 430 * dt;
      var gone = b.y < -10 || hitWall(b.x - 1.5, b.y, 3, 10);
      if (!gone) {
        var live = alive();
        for (var j = 0; j < live.length; j++) {
          var p = foePos(live[j]);
          if (Math.abs(b.x - p.x) < 12 && Math.abs(b.y - p.y) < 11) {
            live[j].alive = false; gone = true;
            var pts = live[j].kind.pts * (1 + (level - 1) * 0.25) | 0;
            score += pts; hud(); S.sfx('boom'); burst(p.x, p.y, live[j].kind.name === 'virus' ? '#f59ad0' : live[j].kind.name === 'worm' ? '#f0b45a' : '#f0717f');
            break;
          }
        }
        if (!gone && zee && Math.abs(b.x - zee.x) < 14 && Math.abs(b.y - zee.y) < 14) {
          var bonus = [150, 200, 300][Math.floor(Math.random() * 3)];
          score += bonus; hud(); S.sfx('zee'); pops.push({ x: zee.x, y: zee.y, txt: '+' + bonus, a: 1.2 }); burst(zee.x, zee.y, A.C.ice);
          zee = null; zeeIn = 14 + Math.random() * 10; gone = true;
        }
      }
      if (gone) bolts.splice(i, 1);
    }

    // Formation: speeds up as it thins out
    var live2 = alive();
    if (!live2.length) { state = 'clear'; stateT = 0; S.stop(); S.sfx('clear'); say('Wave ' + level + ' cleared.'); return; }
    var sp = (16 + level * 4) * (1 + (1 - live2.length / (ROWS * COLS)) * 3);
    fx += fdir * sp * dt;
    var minX = Infinity, maxX = -Infinity, maxY = 0;
    live2.forEach(function (f) { var p = foePos(f); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
    if ((fdir > 0 && maxX > W - 18) || (fdir < 0 && minX < 18)) { fdir = -fdir; fy += 10; }
    // Bugs that reach the firewall chew through it, and reaching UltroBot ends the game.
    live2.forEach(function (f) { var p = foePos(f); hitWall(p.x - 10, p.y - 7, 20, 14); });
    if (maxY + 8 >= PY - 12) { gameOver(); return; }

    // Enemy fire from the lowest foe in a random column
    fireIn -= dt;
    if (fireIn <= 0) {
      var cols = {};
      live2.forEach(function (f) { if (!cols[f.c] || cols[f.c].r < f.r) cols[f.c] = f; });
      var shooters = Object.keys(cols).map(function (k) { return cols[k]; });
      // Aim a bit: prefer the column closest to UltroBot half the time
      var s = shooters[Math.floor(Math.random() * shooters.length)];
      if (Math.random() < 0.5) shooters.forEach(function (c) { if (Math.abs(foePos(c).x - px) < Math.abs(foePos(s).x - px)) s = c; });
      var sp2 = foePos(s);
      packets.push({ x: sp2.x, y: sp2.y + 10 });
      fireIn = Math.max(0.45, 1.25 - level * 0.09) * (0.6 + Math.random() * 0.8);
    }
    for (var k = packets.length - 1; k >= 0; k--) {
      var pk = packets[k]; pk.y += (140 + level * 12) * dt;
      if (pk.y > GROUND || hitWall(pk.x - 3, pk.y - 3, 6, 6)) { packets.splice(k, 1); continue; }
      if (Math.abs(pk.x - px) < 14 && Math.abs(pk.y - PY) < 14) {
        packets.splice(k, 1);
        lives--; hud(); burst(px, PY, A.C.ice); S.stop(); S.sfx('hit');
        if (lives <= 0) { gameOver(); return; }
        state = 'hit'; stateT = 0; say('UltroBot got hit. ' + lives + ' lives left.');
        return;
      }
    }

    // Bonus Z drifting across the top
    zeeIn -= dt;
    if (!zee && zeeIn <= 0) zee = { x: -16, y: 26, v: 70 };
    if (zee) { zee.x += zee.v * dt; if (zee.x > W + 20) { zee = null; zeeIn = 14 + Math.random() * 10; } }
  }

  function gameOver() {
    state = 'over'; stateT = 0;
    S.stop(); setTimeout(function () { S.sfx('over'); }, 300);
    if (score > best) { best = score; A.saveBest(KEY, best); }
    hud(); say('Game over. Score ' + score + '.');
  }

  // ---------- drawing ----------
  function drawVirus(x, y, f) {
    var spin = A.reduced ? 0 : t * 1.5 + f.c;
    ctx.strokeStyle = '#f59ad0'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = spin + i * Math.PI / 4;
      ctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
    }
    ctx.stroke();
    ctx.fillStyle = '#d94fa0'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 3, y - 1, 1.8, 0, 6.283); ctx.arc(x + 3, y - 1, 1.8, 0, 6.283); ctx.fill();
  }
  function drawWorm(x, y, f) {
    var wig = A.reduced ? 0 : Math.sin(t * 8 + f.c) * 2;
    ctx.fillStyle = '#c77d12';
    ctx.beginPath(); ctx.arc(x - 8, y + wig, 4.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#e09a2c';
    ctx.beginPath(); ctx.arc(x - 2, y - wig, 5.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#f0b45a';
    ctx.beginPath(); ctx.arc(x + 5, y + wig * .5, 6.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 7, y - 1 + wig * .5, 1.8, 0, 6.283); ctx.fill();
    ctx.fillStyle = A.C.navy; ctx.beginPath(); ctx.arc(x + 7.5, y - 1 + wig * .5, .9, 0, 6.283); ctx.fill();
  }
  function drawZee(z) {
    var bob = A.reduced ? 0 : Math.sin(t * 5) * 3;
    ctx.fillStyle = A.C.neon; ctx.globalAlpha = .25;
    ctx.beginPath(); ctx.arc(z.x, z.y + bob, 13, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = A.C.ice;
    ctx.font = '700 19px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Z', z.x, z.y + bob + 1);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }
  function draw() {
    A.sky(ctx, W, H, t);
    // Ground strip, same as Nap Run
    ctx.fillStyle = A.C.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = A.C.neon; ctx.globalAlpha = .55; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1); ctx.stroke(); ctx.globalAlpha = 1;
    // Lives as mini bots in the ground strip
    for (var l = 0; l < (lives || 0); l++) A.bot(ctx, 16 + l * 20, GROUND + 11, 13, {});
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 11px Rubik, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('WAVE ' + (level || 1), W - 10, GROUND + 15); ctx.textAlign = 'start';

    // Firewall bricks
    walls.forEach(function (c) {
      if (c.hp <= 0) return;
      ctx.fillStyle = c.hp === 2 ? A.C.neon : '#34508f';
      ctx.fillRect(c.x, c.y, 5, 4);
    });
    // Foes
    foes.forEach(function (f) {
      if (!f.alive) return;
      var p = foePos(f);
      if (f.kind.name === 'virus') drawVirus(p.x, p.y, f);
      else if (f.kind.name === 'worm') drawWorm(p.x, p.y, f);
      else A.bug(ctx, p.x, p.y, 22, { t: t, seed: f.c + f.r * 3, flip: fdir > 0 });
    });
    if (zee) drawZee(zee);
    // Packets (enemy shots) and bolts
    packets.forEach(function (pk) {
      ctx.fillStyle = 'rgba(230,57,70,.3)'; ctx.fillRect(pk.x - 5, pk.y - 5, 10, 10);
      ctx.fillStyle = A.C.pink; ctx.fillRect(pk.x - 3, pk.y - 3, 6, 6);
    });
    bolts.forEach(function (b) {
      ctx.fillStyle = 'rgba(110,231,216,.35)'; ctx.fillRect(b.x - 3, b.y - 2, 6, 14);
      ctx.fillStyle = A.C.mint; ctx.fillRect(b.x - 1.5, b.y, 3, 10);
    });
    sparks.forEach(function (s) { ctx.globalAlpha = Math.max(0, s.a / .6); ctx.fillStyle = s.c; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); });
    ctx.globalAlpha = 1;
    // UltroBot
    var hit = state === 'hit' || state === 'over';
    if (!(state === 'hit' && Math.floor(stateT * 10) % 2 === 0 && !A.reduced)) {
      A.bot(ctx, px, PY, 30, { t: t, dead: hit, walking: state === 'play' && (keys.left !== keys.right), face: keys.right && !keys.left ? 1 : keys.left && !keys.right ? -1 : 0 });
    }
    ctx.textAlign = 'center'; ctx.font = '700 12px Rubik, sans-serif';
    pops.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = A.C.mint; ctx.fillText(p.txt, p.x, p.y); });
    ctx.globalAlpha = 1; ctx.textAlign = 'start';

    if (state === 'ready') A.center(ctx, W, H, 'Bug Blaster', A.go + ' to start');
    else if (state === 'paused') A.center(ctx, W, H, 'Paused', A.go + ' to keep going');
    else if (state === 'clear') A.center(ctx, W, H, 'Wave ' + level + ' cleared!', 'Here comes the next one...');
    else if (state === 'over') A.center(ctx, W, H, 'Game over', 'Score ' + score + ' · ' + A.go + ' to play again');
  }

  // ---------- loop, input, HUD ----------
  function frame(now) {
    raf = 0;
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    update(dt);
    draw();
    if (state === 'play' || state === 'hit' || state === 'clear') raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function hud() { setText('score', A.pad(score || 0)); setText('best', A.pad(best)); setText('lives', lives === undefined ? 3 : lives); setText('level', level || 1); }
  var liveEl = section.querySelector('[data-bb="live"]');
  function say(m) { if (liveEl) liveEl.textContent = m; }

  function startOrResume() {
    if (state === 'ready' || state === 'over') { newGame(); say('Bug Blaster started. Arrow keys to move, Space to shoot.'); }
    else if (state === 'paused') { state = 'play'; S.sfx('pause'); S.music('blaster'); }
    kick();
  }
  function pause() { if (state === 'play') { state = 'paused'; keys.left = keys.right = keys.fire = false; S.stop(); S.sfx('pause'); draw(); } }

  var MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire', ArrowUp: 'fire', KeyW: 'fire' };
  canvas.addEventListener('keydown', function (e) {
    var k = MAP[e.code];
    if (state !== 'play' && (e.code === 'Enter' || (k && state !== 'hit' && state !== 'clear'))) { e.preventDefault(); startOrResume(); return; }
    if (k) { e.preventDefault(); keys[k] = true; }
    else if (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Enter') { if (state === 'play') { e.preventDefault(); pause(); } }
  });
  canvas.addEventListener('keyup', function (e) { var k = MAP[e.code]; if (k) keys[k] = false; });
  canvas.addEventListener('pointerdown', function () {
    canvas.focus({ preventScroll: true });
    if (state === 'ready' || state === 'over' || state === 'paused') startOrResume();
  });
  // On a phone, drag on the game to move; UltroBot fires on its own while your finger is down.
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse' || state !== 'play') return;
    var r = canvas.getBoundingClientRect();
    px = Math.max(20, Math.min(W - 20, (e.clientX - r.left) / r.width * W));
    keys.fire = true;
  });
  canvas.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') keys.fire = false; });
  canvas.addEventListener('blur', function (e) { if (A.moving || (e.relatedTarget && e.relatedTarget.closest('.arcade-stage'))) return; pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  A.touchPad(section.querySelector('.arcade-pad'), function (k, down) {
    var name = MAP[k];
    if (down) { canvas.focus({ preventScroll: true }); if (state === 'ready' || state === 'over' || state === 'paused') startOrResume(); }
    if (name) keys[name] = down;
  });

  var fsBtn = section.querySelector('.arcade-fs');
  S.button(section.querySelector('.arcade-snd'));
  if (fsBtn) A.fullscreen(section.querySelector('.arcade-stage'), canvas, fsBtn, view, draw);

  var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { view.fit(); draw(); }) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', function () { view.fit(); draw(); });

  score = 0; lives = 3; level = 1; t = 0; px = W / 2; pops = []; sparks = [];
  buildWalls(); newWave(); hud();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  draw();
})();
