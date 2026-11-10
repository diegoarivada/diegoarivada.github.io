// Sound effects and chiptune music for the site's games (Nap Run, Bit Maze, Bug Blaster).
// Everything is synthesized live with the Web Audio API, so there are no audio files to load or license,
// and the CSP needs nothing beyond script-src 'self'. Plain script that sets window.ArcadeSound.
//
// The AudioContext is only created after a click, tap, or key press (browsers block sound before that),
// so nothing ever plays on page load. One on/off setting is shared by every game and remembered per browser.
(function () {
  'use strict';
  var KEY = 'arcadeSound';
  var on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* private mode: default on */ }

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  var buttons = [];

  function init() {
    if (ctx || !AC) return !!ctx;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    // A gentle compressor keeps stacked effects from clipping.
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .5; sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = .22; musicBus.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // Call from inside a user gesture (start, jump, click) so the browser lets audio start.
  function unlock() {
    if (!init()) return false;
    if (ctx.state === 'suspended' && !document.hidden) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return true;
  }

  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // One enveloped oscillator note. f1 makes it slide (pitch sweep).
  function tone(bus, type, f0, f1, at, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + .006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(bus);
    o.start(at); o.stop(at + dur + .02);
  }
  function noise(bus, at, dur, vol, freq) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq || 3000, at);
    f.frequency.exponentialRampToValueAtTime(120, at + dur);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(at); s.stop(at + dur + .02);
  }
  function notes(list, step, type, vol, len) {
    var t = ctx.currentTime;
    list.forEach(function (n, i) { if (n) tone(sfxBus, type || 'square', hz(n), 0, t + i * step, len || step * 1.6, vol || .16); });
  }

  // ---------- Sound effects ----------
  var waka = 0;
  var FX = {
    start: function () { notes([60, 64, 67, 72], .07, 'square', .14); },
    jump: function (t) { tone(sfxBus, 'square', 260, 620, t, .14, .12); },
    bit: function (t) { waka = 1 - waka; tone(sfxBus, 'triangle', waka ? 660 : 520, 0, t, .05, .2); },
    zee: function (t) { tone(sfxBus, 'square', hz(83), 0, t, .07, .13); tone(sfxBus, 'square', hz(88), 0, t + .07, .22, .13); },
    power: function (t) {
      tone(sfxBus, 'triangle', 180, 1100, t, .4, .26);
      tone(sfxBus, 'square', 360, 2200, t + .05, .35, .05);
    },
    eat: function (t) { tone(sfxBus, 'square', 300, 1500, t, .16, .14); tone(sfxBus, 'triangle', hz(84), 0, t + .14, .14, .2); },
    shoot: function (t) { tone(sfxBus, 'square', 1100, 240, t, .09, .07); },
    boom: function (t) { noise(sfxBus, t, .22, .45, 2400); tone(sfxBus, 'triangle', 160, 50, t, .2, .3); },
    hit: function (t) { noise(sfxBus, t, .45, .5, 1800); tone(sfxBus, 'sawtooth', 320, 55, t, .5, .16); },
    clear: function () { notes([72, 76, 79, 84, 0, 84], .09, 'square', .13); },
    over: function () { notes([67, 0, 64, 0, 60, 0, 55], .1, 'triangle', .26, .28); },
    pause: function (t) { tone(sfxBus, 'square', hz(76), 0, t, .06, .1); tone(sfxBus, 'square', hz(71), 0, t + .08, .08, .1); }
  };
  function sfx(name) {
    if (!on || !unlock() || !FX[name]) return;
    FX[name](ctx.currentTime + .005);
  }

  // ---------- Music ----------
  // Each theme is 4 bars of eighth notes (32 steps): a bass line, a lead line, and a soft hi-hat.
  // 0 is a rest. Numbers are MIDI notes.
  function bassLine(roots, shape) {
    var out = [];
    roots.forEach(function (r) { shape.forEach(function (s) { out.push(s === null ? 0 : r + s); }); });
    return out;
  }
  var THEMES = {
    // Nap Run: a dreamy, bouncy A minor loop (Am, F, C, G).
    nap: {
      bpm: 128, leadType: 'triangle', leadVol: .3, bassVol: .26,
      bass: bassLine([45, 41, 48, 43], [0, 12, 0, 12, 0, 12, 0, 12]),
      lead: [69, 0, 72, 0, 76, 0, 74, 72, 72, 0, 69, 0, 65, 0, 0, 0, 67, 0, 72, 0, 76, 0, 79, 76, 74, 0, 71, 0, 67, 0, 0, 0]
    },
    // Bit Maze: a chase arpeggio in C minor (Cm, Ab, Bb, G).
    maze: {
      bpm: 146, leadType: 'square', leadVol: .09, bassVol: .3,
      bass: bassLine([36, 44, 46, 43], [0, null, 12, null, 0, 0, 12, null]),
      lead: [72, 75, 79, 75, 72, 75, 79, 84, 68, 72, 75, 72, 68, 72, 75, 80, 70, 74, 77, 74, 70, 74, 77, 82, 67, 71, 74, 71, 79, 0, 74, 0]
    },
    // Bug Blaster: a driving E minor march (Em, C, D, B).
    blaster: {
      bpm: 158, leadType: 'square', leadVol: .1, bassVol: .32,
      bass: bassLine([40, 36, 38, 35], [0, 0, 12, 0, 0, 0, 12, 0]),
      lead: [76, 0, 79, 0, 83, 0, 81, 79, 76, 0, 72, 0, 0, 0, 0, 0, 74, 0, 78, 0, 81, 0, 79, 78, 75, 0, 78, 0, 71, 0, 0, 0]
    }
  };
  var theme = null, step = 0, nextAt = 0, timer = 0;
  function schedule() {
    if (!theme || !ctx) return;
    var len = 60 / theme.bpm / 2; // one eighth note
    // Fell far behind (tab was throttled): skip ahead instead of firing a burst of notes.
    if (nextAt < ctx.currentTime - .2) nextAt = ctx.currentTime + .05;
    while (nextAt < ctx.currentTime + .12) {
      var i = step % 32, b = theme.bass[i], l = theme.lead[i];
      if (b) tone(musicBus, 'triangle', hz(b), 0, nextAt, len * .9, theme.bassVol);
      if (l) tone(musicBus, theme.leadType, hz(l), 0, nextAt, len * 1.4, theme.leadVol);
      if (i % 2 === 1) noise(musicBus, nextAt, .035, .06, 9000);
      step++; nextAt += len;
    }
  }
  function music(name) {
    if (!THEMES[name]) return;
    if (theme === THEMES[name] && timer) return;
    stopMusic();
    theme = THEMES[name];
    play();
  }
  // Start the loop for the current theme (muted: remember the theme so unmuting brings the music back).
  function play() {
    if (!theme || timer || !on || !unlock()) return;
    step = 0; nextAt = ctx.currentTime + .08;
    schedule();
    timer = setInterval(schedule, 30);
  }
  function halt() { if (timer) { clearInterval(timer); timer = 0; } }
  function stopMusic() { halt(); theme = null; }

  // ---------- On/off ----------
  function sync() {
    buttons.forEach(function (b) {
      b.classList.toggle('is-muted', !on);
      b.setAttribute('aria-pressed', on ? 'false' : 'true'); // label stays "Mute sound"; pressed = muted
      b.title = on ? 'Mute sound (M)' : 'Turn sound on (M)';
    });
  }
  function set(v) {
    on = !!v;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ }
    if (ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .02);
    if (on) play(); else halt();
    sync();
  }
  function toggle() { set(!on); }
  // Wire a speaker button. Pressing it doesn't steal focus from the game canvas.
  function button(btn) {
    if (!btn) return;
    buttons.push(btn);
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    sync();
  }
  // M toggles sound while a game canvas (or one of its buttons) has focus, or while one is full screen.
  document.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyM' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var a = document.activeElement;
    var inGame = a && a.closest && a.closest('.arcade-stage, .nap-stage');
    var full = document.querySelector('.arcade-stage.is-full, .nap-stage.is-full');
    if (!inGame && !full) return;
    e.preventDefault(); toggle();
  });
  // Silence everything while the tab is hidden; pick back up when it returns.
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try { if (document.hidden) ctx.suspend(); else ctx.resume(); } catch (e) { /* ignore */ }
  });

  window.ArcadeSound = { sfx: sfx, music: music, stop: stopMusic, unlock: unlock, button: button, toggle: toggle,
    isOn: function () { return on; } };
})();
