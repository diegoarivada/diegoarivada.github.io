// "Nap Run": a tiny endless runner shown on agents.html while UltroBot is asleep.
// A sleepwalking UltroBot hops over bugs and server racks. Tap, click, Space, or Up to jump.
// Hold to jump higher. Everything is drawn on one canvas, so it needs nothing beyond script-src 'self'.
(function () {
  'use strict';
  var canvas = document.getElementById('nap-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var scoreEls = document.querySelectorAll('[data-nap="score"]');
  var bestEls = document.querySelectorAll('[data-nap="best"]');
  var stage = document.getElementById('nap-stage');
  var fsBtn = document.getElementById('nap-fs');
  var full = false;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Sound and music (arcade-sound.js). Without that file the game just runs silent.
  var S = window.ArcadeSound || { sfx: function () {}, music: function () {}, stop: function () {}, button: function () {} };
  S.button(document.getElementById('nap-snd'));

  var KEY = 'napRunBest';
  var best = 0;
  try { best = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { /* private mode */ }

  // World constants (CSS pixels, seconds)
  var GRAVITY = 2600, JUMP_V = 760, CUT_V = 320;
  var START_SPEED = 340, MAX_SPEED = 820, ACCEL = 9;

  // On a phone the canvas is only ~340px wide, which left well under a second to see a bug coming.
  // Narrow screens zoom the world out so at least VIEW_MIN logical px of track are always in view.
  // NARROW_H is the logical height there. Full screen zooms so the playfield is FS_H logical px tall,
  // so the sprites grow with the screen instead of shrinking into a huge empty sky.
  var VIEW_MIN = 480, NARROW_H = 250, FS_H = 300, scale = 1;
  var W = 0, H = 0, GROUND = 0, dpr = 1;
  var hitWhat = 'a bug';
  var state = 'ready';            // ready | running | over
  var overAt = 0, last = 0, raf = 0, visible = true, inView = true;
  var speed, score, t, nextGap, obstacles, zees, pops, stars, hills;
  var bot = { x: 56, y: 0, vy: 0, w: 34, h: 32, onGround: true, holding: false };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW, cssH;
    if (full) {
      // Fill the screen in a wide 2:1 shape (letterboxed), zoomed so the playfield is FS_H logical px tall:
      // the robot grows with the screen, and at least VIEW_MIN px of track always stay in view.
      var cs = getComputedStyle(stage);
      var availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 40;
      cssH = Math.floor(Math.max(140, Math.min(availH, availW / (availW > availH ? 2 : 1.5))));  // a bit taller in portrait
      cssW = Math.floor(availW);
      scale = Math.min(cssH / FS_H, cssW / VIEW_MIN);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    } else {
      if (canvas.style.width) canvas.style.width = '';
      var r = canvas.getBoundingClientRect();
      if (!r.width) return false;
      cssW = r.width;
      scale = cssW < VIEW_MIN ? cssW / VIEW_MIN : 1;
      if (scale < 1) {
        cssH = Math.round(NARROW_H * scale);
        if (canvas.style.height !== cssH + 'px') canvas.style.height = cssH + 'px';
      } else {
        if (canvas.style.height) canvas.style.height = '';
        cssH = canvas.getBoundingClientRect().height;
      }
    }
    W = cssW / scale; H = cssH / scale; GROUND = H - 30;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    stars = [];
    for (var i = 0; i < Math.round(W / 14); i++) stars.push({ x: rand(0, W), y: rand(6, GROUND - 70), r: rand(.5, 1.6), p: rand(0, 6.28) });
    hills = [];
    for (var x = -40; x < W + 160; x += rand(70, 130)) hills.push({ x: x, h: rand(18, 46), w: rand(90, 170) });
    if (state !== 'running') bot.y = GROUND - bot.h;
    return true;
  }

  function reset() {
    speed = START_SPEED; score = 0; t = 0; nextGap = 420;
    obstacles = []; zees = []; pops = [];
    bot.y = GROUND - bot.h; bot.vy = 0; bot.onGround = true;
  }

  // ---------- Input ----------
  function press() {
    if (state === 'over') {
      if (performance.now() - overAt < 450) return; // don't restart from the tap that just ended it
      reset(); state = 'running'; S.music('nap'); kick(); jump(); return;
    }
    if (state === 'ready') { reset(); state = 'running'; S.music('nap'); kick(); }
    jump();
  }
  function jump() {
    bot.holding = true;
    if (bot.onGround) { bot.vy = -JUMP_V; bot.onGround = false; S.sfx('jump'); }
  }
  function release() {
    bot.holding = false;
    if (bot.vy < -CUT_V) bot.vy = -CUT_V; // short tap = short hop
  }

  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); canvas.focus({ preventScroll: true }); press(); });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function isJumpKey(e) { return e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'; }
  document.addEventListener('keydown', function (e) {
    if (!isJumpKey(e)) return;
    // Only grab the key when the game has focus or is mid-run, so Space still scrolls the page otherwise.
    if (document.activeElement !== canvas && state !== 'running') return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    e.preventDefault();
    if (!e.repeat) press();
  });
  document.addEventListener('keyup', function (e) { if (isJumpKey(e)) release(); });

  // ---------- Spawning ----------
  function spawn() {
    var roll = Math.random(), o;
    if (score > 250 && roll < .22) o = { type: 'rack', w: 22, h: 46 };
    else if (score > 120 && roll < .42) o = { type: 'bugs', w: 46, h: 18 };
    else o = { type: 'bug', w: 24, h: 18 };
    o.x = W + 20; o.y = GROUND - o.h; o.seed = Math.random() * 10;
    obstacles.push(o);
    if (Math.random() < .35) zees.push({ x: W + 20 + rand(80, 160), y: GROUND - rand(78, 104), got: false });
    // Gaps scale with speed so every jump stays possible.
    nextGap = speed * rand(.62, 1.15) + rand(110, 240);
  }

  // ---------- Update ----------
  function update(dt) {
    t += dt;
    speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
    score += speed * dt / 12;

    bot.vy += GRAVITY * (bot.holding || bot.vy > 0 ? 1 : 1.6) * dt;
    bot.y += bot.vy * dt;
    if (bot.y >= GROUND - bot.h) { bot.y = GROUND - bot.h; bot.vy = 0; bot.onGround = true; }

    var dx = speed * dt;
    nextGap -= dx;
    if (nextGap <= 0) spawn();

    var bx = bot.x + 5, by = bot.y + 5, bw = bot.w - 10, bh = bot.h - 7;
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= dx;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      var ox = o.x + 3, oy = o.y + 4, ow = o.w - 6, oh = o.h - 4;
      if (bx < ox + ow && bx + bw > ox && by < oy + oh && by + bh > oy) return gameOver(o.type);
    }
    for (var j = zees.length - 1; j >= 0; j--) {
      var z = zees[j];
      z.x -= dx;
      if (z.x < -30) { zees.splice(j, 1); continue; }
      if (!z.got && Math.abs(z.x - (bot.x + bot.w / 2)) < 22 && Math.abs(z.y - (bot.y + bot.h / 2)) < 26) {
        z.got = true; score += 50; S.sfx('zee'); pops.push({ x: z.x, y: z.y, a: 1 });
        zees.splice(j, 1);
      }
    }
    for (var k = pops.length - 1; k >= 0; k--) { pops[k].y -= 40 * dt; pops[k].a -= 1.4 * dt; if (pops[k].a <= 0) pops.splice(k, 1); }
    for (var s = 0; s < hills.length; s++) {
      hills[s].x -= dx * .18;
      if (hills[s].x + hills[s].w < -20) hills[s].x += W + 260;
    }
    for (var q = 0; q < stars.length; q++) {
      stars[q].x -= dx * .03;
      if (stars[q].x < 0) stars[q].x += W;
    }
    showScore();
  }

  function gameOver(type) {
    hitWhat = type === 'rack' ? 'a server rack' : 'a bug';
    state = 'over'; overAt = performance.now(); bot.holding = false;
    S.stop(); S.sfx('hit'); setTimeout(function () { if (state === 'over') S.sfx('over'); }, 350);
    var s = Math.floor(score);
    if (s > best) { best = s; try { localStorage.setItem(KEY, String(best)); } catch (e) { /* ignore */ } }
    showScore();
  }

  function pad(n) { n = Math.floor(n); return ('00000' + n).slice(-5); }
  function showScore() {
    var s = pad(score || 0), b = pad(best);
    scoreEls.forEach(function (el) { el.textContent = s; });
    bestEls.forEach(function (el) { el.textContent = b; });
  }

  // ---------- Drawing ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#050a16'); g.addColorStop(.7, '#0b1530'); g.addColorStop(1, '#131a35');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = reduced ? .7 : .45 + .45 * Math.sin(t * 1.6 + s.p + (state === 'running' ? 0 : performance.now() / 900));
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Crescent moon, same trick as the hero: a lit disc with a sky-colored bite.
    var mx = W - 70, my = 38;
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, 16, 0, 6.283); ctx.clip();
    ctx.fillStyle = '#f4e9c6'; ctx.fillRect(mx - 16, my - 16, 32, 32);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx + 7, my - 5, 14, 0, 6.283); ctx.fill();
    ctx.restore();
    // Distant hills
    ctx.fillStyle = '#16224a';
    for (var h = 0; h < hills.length; h++) {
      var hl = hills[h];
      ctx.beginPath(); ctx.moveTo(hl.x, GROUND);
      ctx.quadraticCurveTo(hl.x + hl.w / 2, GROUND - hl.h * 2, hl.x + hl.w, GROUND);
      ctx.fill();
    }
  }

  function drawGround() {
    ctx.fillStyle = '#0d1631'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = '#6394f8'; ctx.globalAlpha = .55; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1); ctx.stroke();
    ctx.globalAlpha = .35; ctx.lineWidth = 2;
    var off = (t * speed) % 38;
    ctx.beginPath();
    for (var x = -off; x < W; x += 38) { ctx.moveTo(x, GROUND + 12); ctx.lineTo(x + 12, GROUND + 12); }
    var off2 = (t * speed * .8) % 61;
    for (var x2 = -off2; x2 < W; x2 += 61) { ctx.moveTo(x2, GROUND + 21); ctx.lineTo(x2 + 5, GROUND + 21); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  // The site's robot, shrunk: navy outline, red ears, closed eyes because it's sleepwalking.
  function drawBot() {
    var x = bot.x, y = bot.y, w = bot.w, h = bot.h;
    var dead = state === 'over';
    var bob = bot.onGround && state === 'running' && !reduced ? Math.sin(t * 22) * 1.2 : 0;
    y += bob;
    // shadow
    var lift = Math.max(0, GROUND - (bot.y + h));
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND + 3, Math.max(6, 15 - lift / 8), 3, 0, 0, 6.283); ctx.fill();
    // little legs
    ctx.strokeStyle = '#9cc7ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    var step = bot.onGround && state === 'running' ? Math.sin(t * 22) * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + h - 2); ctx.lineTo(x + 11 + step, y + h + 3);
    ctx.moveTo(x + w - 11, y + h - 2); ctx.lineTo(x + w - 11 - step, y + h + 3);
    ctx.stroke();
    // antenna
    ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y - 6); ctx.stroke();
    ctx.fillStyle = dead ? '#e63946' : '#56637a';
    ctx.beginPath(); ctx.arc(x + w / 2, y - 8, 3.2, 0, 6.283); ctx.fill();
    // ears
    ctx.fillStyle = '#e63946';
    roundRect(x - 3, y + 11, 4, 9, 2); ctx.fill();
    roundRect(x + w - 1, y + 11, 4, 9, 2); ctx.fill();
    // head
    ctx.fillStyle = '#e7ecf5'; ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 2;
    roundRect(x, y + 1, w, h - 3, 9); ctx.fill(); ctx.stroke();
    // visor
    ctx.fillStyle = '#1d3557';
    roundRect(x + 5, y + 7, w - 10, 14, 6); ctx.fill();
    // eyes: sleepy lids while running, X eyes when bonked
    ctx.strokeStyle = dead ? '#f0717f' : '#9cc7ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (dead) {
      [[x + 12, y + 14], [x + w - 12, y + 14]].forEach(function (p) {
        ctx.moveTo(p[0] - 3, p[1] - 3); ctx.lineTo(p[0] + 3, p[1] + 3);
        ctx.moveTo(p[0] + 3, p[1] - 3); ctx.lineTo(p[0] - 3, p[1] + 3);
      });
    } else {
      ctx.moveTo(x + 9, y + 13); ctx.quadraticCurveTo(x + 12, y + 17, x + 15, y + 13);
      ctx.moveTo(x + w - 15, y + 13); ctx.quadraticCurveTo(x + w - 12, y + 17, x + w - 9, y + 13);
    }
    ctx.stroke();
    // mouth
    ctx.strokeStyle = '#1d3557'; ctx.beginPath();
    if (dead) { ctx.arc(x + w / 2, y + 26, 3, Math.PI, 0); }
    else { ctx.moveTo(x + w / 2 - 4, y + 24); ctx.quadraticCurveTo(x + w / 2, y + 27, x + w / 2 + 4, y + 24); }
    ctx.stroke();
    // floating z while it naps on the start screen
    if (state === 'ready' && !reduced) {
      var k = (performance.now() / 1400) % 1;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#6394f8'; ctx.font = '700 ' + (10 + k * 8) + 'px Rubik, sans-serif';
      ctx.fillText('z', x + w + 2 + k * 14, y - 4 - k * 22);
      ctx.globalAlpha = 1;
    }
  }

  function drawBug(x, y, seed) {
    var wig = reduced ? 0 : Math.sin(t * 30 + seed) * 2;
    ctx.strokeStyle = '#f0717f'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var lx = x + 6 + i * 6;
      ctx.moveTo(lx, y + 11); ctx.lineTo(lx - 3 + (i % 2 ? wig : -wig), y + 18);
    }
    ctx.moveTo(x + 4, y + 6); ctx.lineTo(x - 1, y + 1);
    ctx.moveTo(x + 7, y + 4); ctx.lineTo(x + 5, y - 2);
    ctx.stroke();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.ellipse(x + 13, y + 9, 10, 7, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#7a1f2b'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + 13, y + 2); ctx.lineTo(x + 13, y + 16); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 6, y + 7, 1.6, 0, 6.283); ctx.fill();
  }

  function drawRack(o) {
    ctx.fillStyle = '#26365f'; ctx.strokeStyle = '#6394f8'; ctx.lineWidth = 1.5;
    roundRect(o.x, o.y, o.w, o.h, 3); ctx.fill(); ctx.stroke();
    for (var i = 0; i < 4; i++) {
      var ry = o.y + 5 + i * 10;
      ctx.fillStyle = '#131c2e'; ctx.fillRect(o.x + 3, ry, o.w - 6, 7);
      var on = reduced || Math.sin(t * 9 + i * 2 + o.seed) > 0;
      ctx.fillStyle = on ? '#6ee7d8' : '#2a9d8f';
      ctx.fillRect(o.x + o.w - 7, ry + 2, 2.5, 2.5);
    }
  }

  function drawZee(z) {
    var bob = reduced ? 0 : Math.sin(t * 5 + z.x / 40) * 3;
    ctx.fillStyle = '#6394f8'; ctx.globalAlpha = .25;
    ctx.beginPath(); ctx.arc(z.x, z.y + bob - 5, 12, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#9cc7ff';
    ctx.font = '700 18px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Z', z.x, z.y + bob - 4);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }

  function drawCenter(title, sub) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + (scale < 1 ? 28 : 22) + 'px Rubik, sans-serif';
    ctx.fillText(title, W / 2, H * .36);
    ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '500 ' + (scale < 1 ? 19 : 14) + 'px Rubik, sans-serif';
    ctx.fillText(sub, W / 2, H * .36 + (scale < 1 ? 32 : 24));
    ctx.textAlign = 'start';
  }

  function draw() {
    drawSky();
    drawGround();
    for (var i = 0; i < zees.length; i++) drawZee(zees[i]);
    for (var j = 0; j < obstacles.length; j++) {
      var o = obstacles[j];
      if (o.type === 'rack') drawRack(o);
      else if (o.type === 'bugs') { drawBug(o.x, o.y, o.seed); drawBug(o.x + 22, o.y, o.seed + 2); }
      else drawBug(o.x, o.y, o.seed);
    }
    drawBot();
    for (var k = 0; k < pops.length; k++) {
      ctx.globalAlpha = Math.max(0, pops[k].a); ctx.fillStyle = '#6ee7d8';
      ctx.font = '700 13px Rubik, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('+50', pops[k].x, pops[k].y); ctx.textAlign = 'start'; ctx.globalAlpha = 1;
    }
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (state === 'ready') drawCenter('Nap Run', touch ? 'Tap to start. Tap to jump, hold to jump higher.' : 'Press Space or click to start. Hold to jump higher.');
    if (state === 'over') drawCenter('Bonk! UltroBot hit ' + hitWhat, touch ? 'Tap to try again' : 'Press Space or click to try again');
  }

  // ---------- Loop ----------
  function frame(now) {
    raf = 0;
    var dt = Math.max(0, Math.min(.033, (now - last) / 1000 || 0));
    last = now;
    if (state === 'running') update(dt);
    draw();
    // Keep animating only while something moves; idle screens settle after drawing.
    if (visible && inView && (state === 'running' || (state === 'ready' && !reduced))) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && W) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) kick();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      // Scrolled away mid-run: the game freezes, so the music stops with it.
      if (state === 'running') { if (inView) S.music('nap'); else S.stop(); }
      if (inView) kick();
    }).observe(canvas);
  }
  // ---------- Full screen ----------
  // Real full screen where the browser allows it on an element (desktop, Android, iPad). iPhone Safari only
  // allows it for video, so there the stage simply covers the window and the page stops scrolling.
  var native = !!(stage && (stage.requestFullscreen || stage.webkitRequestFullscreen));
  var holder = document.createComment('nap-stage');
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function setFull(on) {
    if (!stage || on === full) return;
    full = on;
    // A transformed ancestor (the scroll-in animation) would trap position: fixed inside the card, so the
    // stage moves to <body> while full and goes back to its spot afterwards.
    if (on) { stage.before(holder); document.body.append(stage); }
    else if (holder.parentNode) { holder.replaceWith(stage); }
    stage.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('nap-locked', on);
    if (fsBtn) { fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen'); fsBtn.title = on ? 'Exit full screen (F or Esc)' : 'Full screen (F)'; }
    if (!on) { canvas.style.width = ''; canvas.style.height = ''; }
    if (resize()) draw();
    // The stage's new layout (and the vanished scrollbar) only settle after a frame, so measure again then.
    requestAnimationFrame(function () { if (resize()) draw(); });
    setTimeout(function () { if (resize()) draw(); }, 200);
    canvas.focus({ preventScroll: true });
    kick();
  }
  function enter() {
    setFull(true);
    if (native && !fsElement()) {
      var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      try {
        var pr = req.call(stage, { navigationUI: 'hide' });
        if (pr && pr.then) pr.then(function () {
          // Phones: landscape is the better view when the browser lets us lock it; ignore it if not.
          try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) { /* unsupported */ }
        }).catch(function () { /* the window-sized stage still works */ });
      } catch (e) { /* the window-sized stage still works */ }
    }
  }
  function exit() {
    if (fsElement()) {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      try { ex.call(document); } catch (e) { /* fall through */ }
    }
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* unsupported */ }
    setFull(false);
  }
  function toggle() { if (full) exit(); else enter(); }
  // In full screen, a tap anywhere on the dark backdrop jumps too: a much bigger target on a phone.
  if (stage) stage.addEventListener('pointerdown', function (e) {
    if (!full || e.target === canvas || (fsBtn && fsBtn.contains(e.target))) return;
    e.preventDefault(); press();
  });
  if (fsBtn) {
    fsBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    fsBtn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!fsElement() && full) setFull(false);
      else if (full) setTimeout(function () { if (resize()) draw(); }, 50);
    });
  });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyF' && (full || document.activeElement === canvas || document.activeElement === fsBtn)) { e.preventDefault(); toggle(); }
    else if (e.code === 'Escape' && full) { e.preventDefault(); exit(); }
  });
  window.addEventListener('resize', function () { if (full && resize()) draw(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { if (full && resize()) draw(); }, 250); });

  // The section is hidden while UltroBot is awake, so (re)size whenever it gets real width.
  var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { if (resize()) { draw(); kick(); } }) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', function () { if (resize()) draw(); });

  reset();
  showScore();
  if (resize()) { draw(); kick(); }
})();
