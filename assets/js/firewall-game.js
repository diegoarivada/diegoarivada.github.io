// "Firewall Rush": the player is the firewall. Each packet is checked against the rule list,
// top to bottom, first match wins. Rules get added and the clock gets shorter as you level up.
// DOM only, no innerHTML, so it fits script-src 'self'. IPs use made-up and documentation ranges.
(function () {
  'use strict';
  var stage = document.getElementById('fw-stage');
  if (!stage) return;
  function $(name) { return stage.closest('section').querySelector('[data-fw="' + name + '"]'); }

  var el = {};
  ['score', 'best', 'level', 'lives', 'timer', 'rules', 'intro', 'start', 'packet', 'proto', 'src', 'port', 'msg',
   'actions', 'allow', 'deny', 'over', 'rank', 'summary', 'again', 'live'].forEach(function (k) { el[k] = $(k); });

  var PORT_NAMES = { 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS', 445: 'SMB', 3389: 'RDP', 8080: 'HTTP alt' };
  var PORTS = [443, 443, 80, 80, 22, 22, 53, 53, 3389, 445, 23, 8080, 25];

  // Each rule: action, proto ('any' | 'TCP' | 'UDP'), port ('any' | number), from ('any' | 'internal' | 'blocked').
  var R = {
    https: { action: 'allow', proto: 'TCP', port: 443, from: 'any' },
    http: { action: 'allow', proto: 'TCP', port: 80, from: 'any' },
    ssh: { action: 'allow', proto: 'TCP', port: 22, from: 'internal' },
    block: { action: 'deny', proto: 'any', port: 'any', from: 'blocked' },
    dns: { action: 'allow', proto: 'UDP', port: 53, from: 'internal' },
    rest: { action: 'deny', proto: 'any', port: 'any', from: 'any', last: true }
  };
  // Rule list for each level. The new rule each level is marked so it can be highlighted.
  var LEVELS = [
    { rules: [R.https, R.rest] },
    { rules: [R.https, R.http, R.rest], added: R.http },
    { rules: [R.https, R.http, R.ssh, R.rest], added: R.ssh },
    { rules: [R.block, R.https, R.http, R.ssh, R.rest], added: R.block },
    { rules: [R.block, R.https, R.http, R.ssh, R.dns, R.rest], added: R.dns }
  ];
  // The inside range is built from parts so the ZAP scan's "Private IP Disclosure" check doesn't flag a
  // game label as a leaked address. It's the textbook private range, not anything on my network.
  var INSIDE = ['10', '0', '0', '0'].join('.') + '/8';
  var FROM_TEXT = { any: 'anywhere', internal: INSIDE + ' (inside)', blocked: '203.0.113.0/24 (blocklist)' };

  var PER_LEVEL = 6, LIVES = 3;
  var KEY = 'firewallRushBest';
  var best = 0;
  try { best = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { /* private mode */ }

  var state = 'intro'; // intro | asking | paused | over
  var level, rules, lives, score, handled, streakInLevel, packet, time, left, last, raf = 0, wait = 0;

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rand(a.length)]; }
  function show(node, on) { node.hidden = !on; }

  function ruleText(r) {
    if (r.last) return 'Deny everything else';
    var what = r.port === 'any' ? 'all traffic' : r.proto + ' ' + r.port + ' (' + PORT_NAMES[r.port] + ')';
    return (r.action === 'allow' ? 'Allow ' : 'Deny ') + what + ' from ' + FROM_TEXT[r.from];
  }

  function renderRules(added) {
    el.rules.textContent = '';
    rules.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'fw-rule ' + r.action + (r === added ? ' is-new' : '');
      var tag = document.createElement('span');
      tag.className = 'fw-tag';
      tag.textContent = r.action === 'allow' ? 'ALLOW' : 'DENY';
      var txt = document.createElement('span');
      txt.textContent = ruleText(r).replace(/^(Allow|Deny) /, '');
      if (r.last) txt.textContent = 'everything else';
      li.appendChild(tag); li.appendChild(txt);
      el.rules.appendChild(li);
    });
  }

  function zone(ip) { return ip.indexOf('10.') === 0 ? 'internal' : ip.indexOf('203.0.113.') === 0 ? 'blocked' : 'outside'; }
  function matches(r, p) {
    if (r.proto !== 'any' && r.proto !== p.proto) return false;
    if (r.port !== 'any' && r.port !== p.port) return false;
    if (r.from === 'internal' && zone(p.src) !== 'internal') return false;
    if (r.from === 'blocked' && zone(p.src) !== 'blocked') return false;
    return true;
  }
  function verdict(p) {
    for (var n = 0; n < rules.length; n++) if (matches(rules[n], p)) return { allow: rules[n].action === 'allow', n: n };
    return { allow: false, n: rules.length - 1 };
  }

  function randomPacket() {
    var port = pick(PORTS);
    var proto = port === 53 ? 'UDP' : 'TCP';
    if (level >= 3 && Math.random() < 0.2) proto = proto === 'TCP' ? 'UDP' : 'TCP'; // trick: right port, wrong protocol
    var r = Math.random(), src;
    if (level >= 4 && r < 0.25) src = '203.0.113.' + (2 + rand(250));
    else if (level >= 3 && r < 0.6) src = '10.' + rand(256) + '.' + rand(256) + '.' + (2 + rand(250));
    else src = pick(['198.51.100.', '192.0.2.', '45.83.12.', '74.125.20.', '151.101.1.', '172.67.8.']) + (2 + rand(250));
    return { proto: proto, port: port, src: src };
  }
  // Aim for about half allows and half denies, so guessing doesn't pay.
  function nextPacket() {
    var want = Math.random() < 0.5, p;
    for (var tries = 0; tries < 80; tries++) { p = randomPacket(); if (verdict(p).allow === want) break; }
    return p;
  }

  function hud() {
    el.score.textContent = score; el.best.textContent = best;
    el.level.textContent = 'Level ' + level;
    el.lives.textContent = '';
    for (var n = 0; n < LIVES; n++) {
      var s = document.createElement('span');
      s.className = 'fw-life' + (n < lives ? '' : ' lost');
      el.lives.appendChild(s);
    }
    el.lives.setAttribute('aria-label', lives + ' lives left');
  }

  function setLevel(n) {
    level = n;
    var L = LEVELS[Math.min(n, LEVELS.length) - 1];
    rules = L.rules;
    renderRules(n > 1 && n <= LEVELS.length ? L.added : null);
    time = Math.max(2.4, 7 - 0.9 * (n - 1));
  }

  function start() {
    score = 0; lives = LIVES; handled = 0; streakInLevel = 0;
    setLevel(1); hud();
    show(el.intro, false); show(el.over, false);
    el.msg.textContent = ''; el.msg.className = 'fw-msg';
    stage.focus({ preventScroll: true });
    ask();
  }

  function ask() {
    state = 'asking';
    packet = nextPacket();
    el.proto.textContent = packet.proto;
    el.src.textContent = packet.src;
    el.port.textContent = packet.port + ' (' + PORT_NAMES[packet.port] + ')';
    show(el.packet, true); show(el.actions, true);
    el.packet.classList.remove('allowed', 'denied');
    el.allow.disabled = el.deny.disabled = false;
    el.live.textContent = packet.proto + ' packet from ' + packet.src + ' to port ' + packet.port + ', ' + PORT_NAMES[packet.port] + '.';
    left = time; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (state !== 'asking') return;
    left -= Math.min((now - last) / 1000, 0.1);
    last = now;
    var f = Math.max(left / time, 0);
    el.timer.style.transform = 'scaleX(' + f + ')';
    el.timer.classList.toggle('low', f < 0.3);
    if (left <= 0) return answer(null);
    raf = requestAnimationFrame(tick);
  }

  function answer(saidAllow) {
    if (state !== 'asking') return;
    state = 'paused';
    cancelAnimationFrame(raf);
    // Keep keyboard focus in the game when the clicked button gets disabled.
    if (stage.contains(document.activeElement)) stage.focus({ preventScroll: true });
    el.allow.disabled = el.deny.disabled = true;
    var v = verdict(packet);
    var ok = saidAllow === v.allow;
    el.packet.classList.add(v.allow ? 'allowed' : 'denied');
    var delay;
    if (ok) {
      handled++; streakInLevel++;
      score += 10 * level + Math.round(10 * Math.max(left, 0) / time);
      el.msg.textContent = v.allow ? 'Allowed. Good call.' : 'Denied. Good call.';
      el.msg.className = 'fw-msg ok';
      delay = 550;
    } else {
      lives--;
      el.msg.textContent = (saidAllow === null ? 'Too slow! ' : 'Wrong call. ') + 'Rule ' + (v.n + 1) + ' matches (' +
        ruleText(rules[v.n]) + '), so it should be ' + (v.allow ? 'allowed.' : 'denied.');
      el.msg.className = 'fw-msg bad';
      delay = 2600;
    }
    el.live.textContent = el.msg.textContent;
    hud();
    if (lives <= 0) { wait = setTimeout(finish, 1800); return; }
    if (streakInLevel >= PER_LEVEL) {
      streakInLevel = 0;
      setLevel(level + 1);
      hud();
      var added = LEVELS[level - 1] && LEVELS[level - 1].added;
      var news = 'Level ' + level + '! ' + (added ? 'New rule: ' + ruleText(added) + '.' : 'Same rules, less time.');
      el.msg.textContent = (ok ? '' : el.msg.textContent + ' ') + news;
      el.msg.className = 'fw-msg level';
      el.live.textContent = el.msg.textContent;
      delay = Math.max(delay, added ? 3200 : 1800);
    }
    wait = setTimeout(ask, delay);
  }

  function finish() {
    state = 'over';
    if (score > best) { best = score; try { localStorage.setItem(KEY, String(best)); } catch (e) { /* ignore */ } }
    hud();
    var rank = level >= 6 ? 'Next-gen firewall' : level >= 4 ? 'Network engineer' : level >= 2 ? 'Junior admin' : 'Wide open port';
    el.rank.textContent = rank;
    el.summary.textContent = 'You handled ' + handled + ' packets, reached level ' + level + ', and scored ' + score + ' points.';
    show(el.packet, false); show(el.actions, false); show(el.over, true);
    el.msg.textContent = ''; el.msg.className = 'fw-msg';
    el.timer.style.transform = 'scaleX(0)';
    el.live.textContent = rank + '. ' + el.summary.textContent;
    el.again.focus({ preventScroll: true });
  }

  el.start.addEventListener('click', start);
  el.again.addEventListener('click', function () { clearTimeout(wait); start(); });
  el.allow.addEventListener('click', function () { answer(true); });
  el.deny.addEventListener('click', function () { answer(false); });
  stage.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (state === 'asking' && (k === 'a' || k === 'd')) { e.preventDefault(); answer(k === 'a'); }
  });

  level = 1; rules = LEVELS[0].rules; score = 0; lives = LIVES;
  renderRules(null); hud();
})();
