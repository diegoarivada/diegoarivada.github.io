// Shared bits for the games page: canvas setup, the Nap Run palette, and UltroBot and bug sprites
// drawn the same way as Nap Run (assets/js/nap-game.js), so every game looks like the same world.
// Plain script that sets window.Arcade, so it only needs script-src 'self'.
(function () {
  'use strict';
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var C = {
    sky0: '#050a16', sky1: '#0b1530', sky2: '#131a35', hill: '#16224a', ground: '#0d1631',
    neon: '#6394f8', ice: '#9cc7ff', mint: '#6ee7d8', teal: '#2a9d8f', navy: '#1d3557',
    red: '#e63946', pink: '#f0717f', wine: '#7a1f2b', warn: '#f0b45a', white: '#e7ecf5', rack: '#26365f'
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Fixed logical size, drawn sharp at any CSS width and pixel ratio.
  function setup(canvas, W, H) {
    var ctx = canvas.getContext('2d');
    var view = { ctx: ctx, W: W, H: H, k: 1 };
    function fit() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cssW = canvas.clientWidth || W;
      var pw = Math.round(cssW * dpr), ph = Math.round(cssW * H / W * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      view.k = pw / W;
      ctx.setTransform(view.k, 0, 0, view.k, 0, 0);
      return true;
    }
    view.fit = fit;
    fit();
    return view;
  }

  var stars = [];
  for (var i = 0; i < 46; i++) stars.push({ x: Math.random(), y: Math.random() * 0.8, r: Math.random() * 1.2 + 0.3, p: Math.random() * 6 });
  function sky(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.sky0); g.addColorStop(.7, C.sky1); g.addColorStop(1, C.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = reduced ? .5 : .3 + .35 * Math.sin(t * 1.6 + s.p);
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // UltroBot at its Nap Run size (34 x 32), scaled to `size` px wide. Awake here: open eyes.
  // opts: { dead, t, walking, face: -1 | 0 | 1 }
  function bot(ctx, cx, cy, size, opts) {
    opts = opts || {};
    var s = size / 34, w = 34, h = 32, t = opts.t || 0, dead = !!opts.dead;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
    var bob = opts.walking && !reduced ? Math.sin(t * 22) * 1.2 : 0;
    var x = 0, y = bob;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ice; ctx.lineWidth = 3;
    var step = opts.walking && !reduced ? Math.sin(t * 22) * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + h - 2); ctx.lineTo(x + 11 + step, y + h + 3);
    ctx.moveTo(x + w - 11, y + h - 2); ctx.lineTo(x + w - 11 - step, y + h + 3);
    ctx.stroke();
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y - 6); ctx.stroke();
    ctx.fillStyle = dead ? C.red : '#56637a';
    ctx.beginPath(); ctx.arc(x + w / 2, y - 8, 3.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.red;
    roundRect(ctx, x - 3, y + 11, 4, 9, 2); ctx.fill();
    roundRect(ctx, x + w - 1, y + 11, 4, 9, 2); ctx.fill();
    ctx.fillStyle = C.white; ctx.strokeStyle = C.navy; ctx.lineWidth = 2;
    roundRect(ctx, x, y + 1, w, h - 3, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.navy;
    roundRect(ctx, x + 5, y + 7, w - 10, 14, 6); ctx.fill();
    var look = (opts.face || 0) * 2;
    if (dead) {
      ctx.strokeStyle = C.pink; ctx.beginPath();
      [[x + 12, y + 14], [x + w - 12, y + 14]].forEach(function (p) {
        ctx.moveTo(p[0] - 3, p[1] - 3); ctx.lineTo(p[0] + 3, p[1] + 3);
        ctx.moveTo(p[0] + 3, p[1] - 3); ctx.lineTo(p[0] - 3, p[1] + 3);
      });
      ctx.stroke();
    } else {
      ctx.fillStyle = C.ice;
      ctx.beginPath(); ctx.arc(x + 12 + look, y + 14, 2.6, 0, 6.283); ctx.arc(x + w - 12 + look, y + 14, 2.6, 0, 6.283); ctx.fill();
    }
    ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath();
    if (dead) ctx.arc(x + w / 2, y + 26, 3, Math.PI, 0);
    else { ctx.moveTo(x + w / 2 - 4, y + 24); ctx.quadraticCurveTo(x + w / 2, y + 27, x + w / 2 + 4, y + 24); }
    ctx.stroke();
    ctx.restore();
  }

  // The Nap Run bug (about 24 x 18), centered on cx, cy and scaled to `size` px wide.
  // opts: { t, seed, body, legs, scared, flip }
  function bug(ctx, cx, cy, size, opts) {
    opts = opts || {};
    var s = size / 24, t = opts.t || 0;
    var body = opts.scared ? '#3b5bd1' : (opts.body || C.red);
    var legs = opts.scared ? C.ice : (opts.legs || C.pink);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(opts.flip ? -s : s, s); ctx.translate(-12, -9);
    var wig = reduced ? 0 : Math.sin(t * 30 + (opts.seed || 0)) * 2;
    ctx.strokeStyle = legs; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var lx = 6 + i * 6;
      ctx.moveTo(lx, 11); ctx.lineTo(lx - 3 + (i % 2 ? wig : -wig), 18);
    }
    ctx.moveTo(4, 6); ctx.lineTo(-1, 1);
    ctx.moveTo(7, 4); ctx.lineTo(5, -2);
    ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(13, 9, 10, 7, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = opts.scared ? '#1d2d73' : C.wine; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(13, 2); ctx.lineTo(13, 16); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, 7, 1.6, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function center(ctx, W, H, title, sub) {
    ctx.fillStyle = 'rgba(5, 10, 22, .62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = '700 24px Rubik, sans-serif';
    ctx.fillText(title, W / 2, H * .46);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 14px Rubik, sans-serif';
    ctx.fillText(sub, W / 2, H * .46 + 26);
    ctx.textAlign = 'start';
  }

  function pad(n) { n = Math.floor(n); return ('00000' + n).slice(-5); }
  function loadBest(key) { try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; } }
  function saveBest(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) { /* private mode */ } }

  // Hold-to-press touch buttons: elements with data-key="ArrowLeft" etc. call press(key, down).
  function touchPad(root, press) {
    if (!root) return;
    root.querySelectorAll('[data-key]').forEach(function (b) {
      var k = b.getAttribute('data-key');
      function down(e) { e.preventDefault(); b.classList.add('on'); press(k, true); }
      function up(e) { e.preventDefault(); b.classList.remove('on'); press(k, false); }
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  // Full screen, same approach as Nap Run: the real Fullscreen API where it exists, and a fixed
  // window-sized stage everywhere (iPhone has no Fullscreen API for page elements, so that's all it gets).
  // stage holds .arcade-screen (canvas + button) and the optional .arcade-pad.
  function fullscreen(stage, canvas, btn, view, redraw) {
    var api = window.Arcade;
    var full = false, holder = document.createComment('arcade-stage');
    var screenBox = stage.querySelector('.arcade-screen');
    var native = !!(stage.requestFullscreen || stage.webkitRequestFullscreen);
    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
    function size() {
      if (!full) screenBox.style.width = '';
      else {
        var row = getComputedStyle(stage).flexDirection === 'row';
        var pad = stage.querySelector('.arcade-pad');
        var pw = pad && pad.offsetParent ? pad.offsetWidth + 16 : 0, ph = pad && pad.offsetParent ? pad.offsetHeight + 16 : 0;
        var top = stage.querySelector('.arcade-fs-score'), th = top && top.offsetParent ? top.offsetHeight + 12 : 0;
        var availW = stage.clientWidth - 32 - (row ? pw : 0);
        var availH = stage.clientHeight - 32 - th - (row ? 0 : ph);
        screenBox.style.width = Math.floor(Math.max(160, Math.min(availW, availH * view.W / view.H))) + 'px';
      }
      view.fit(); redraw();
    }
    function set(on) {
      if (on === full) return;
      full = on;
      // A transformed ancestor would trap position: fixed inside the card, so the stage moves to <body>
      // while full. Moving it blurs the canvas, so the games are told not to pause for that.
      api.moving = true;
      if (on) { stage.before(holder); document.body.append(stage); }
      else if (holder.parentNode) holder.replaceWith(stage);
      stage.classList.toggle('is-full', on);
      document.documentElement.classList.toggle('nap-locked', on);
      btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
      btn.title = on ? 'Exit full screen (F or Esc)' : 'Full screen (F)';
      canvas.focus({ preventScroll: true });
      setTimeout(function () { api.moving = false; }, 100);
      size();
      setTimeout(size, 60); setTimeout(size, 250);
    }
    function enter() {
      set(true);
      if (native && !fsEl()) {
        var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
        try {
          var pr = req.call(stage, { navigationUI: 'hide' });
          if (pr && pr.then) pr.then(function () {
            try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) { /* unsupported */ }
          }).catch(function () { /* the window-sized stage still works */ });
        } catch (e) { /* the window-sized stage still works */ }
      }
    }
    function exit() {
      if (fsEl()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; try { ex.call(document); } catch (e) { /* ignore */ } }
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* unsupported */ }
      set(false);
    }
    function toggle() { if (full) exit(); else enter(); }
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { if (!fsEl() && full) set(false); else if (full) setTimeout(size, 50); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyF' && (full || document.activeElement === canvas)) { e.preventDefault(); toggle(); }
      else if (e.code === 'Escape' && full) { e.preventDefault(); exit(); }
    });
    window.addEventListener('resize', function () { if (full) size(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { if (full) size(); }, 250); });
    return { toggle: toggle, isFull: function () { return full; } };
  }

  // What to tell people on the start and pause screens.
  var touch = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
  var go = touch ? 'Tap' : 'Click or press Enter';

  window.Arcade = { C: C, reduced: reduced, go: go, moving: false, fullscreen: fullscreen, roundRect: roundRect, setup: setup, sky: sky, bot: bot, bug: bug,
    center: center, pad: pad, loadBest: loadBest, saveBest: saveBest, touchPad: touchPad };
})();
