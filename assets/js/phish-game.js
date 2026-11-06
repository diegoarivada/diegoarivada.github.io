// "Phish or Legit": read an email, decide if it's phishing before the timer runs out, learn why.
// All companies, people, and domains are made up. DOM only, no innerHTML, so it fits script-src 'self'.
(function () {
  'use strict';
  var stage = document.getElementById('pg-stage');
  if (!stage) return;
  function $(name) { return stage.closest('section').querySelector('[data-pg="' + name + '"]'); }

  var EMAILS = [
    { from: 'Northwind Bank Security', addr: 'alerts@northwind-bank-secure.co', subject: 'Your account has been locked',
      body: 'We detected unusual sign-in activity. Verify your identity within 24 hours or your account will be permanently closed.',
      link: 'Verify now', url: 'http://northwind-bank-secure.co/verify', phish: true,
      why: 'The domain is a lookalike (northwind-bank-secure.co, not northwindbank.com), and the scary 24-hour deadline is there to rush you.' },
    { from: 'Northwind Bank', addr: 'statements@northwindbank.com', subject: 'Your October statement is ready',
      body: 'Your monthly statement is available. Sign in through our app or by typing northwindbank.com into your browser. We will never ask for your password by email.',
      link: 'View statement', url: 'https://northwindbank.com/statements', phish: false,
      why: 'The sender and link match the real domain, there is no deadline, and it tells you to go to the site yourself.' },
    { from: 'IT Help Desk', addr: 'helpdesk@it-support-portal.net', subject: 'Your password expires today',
      body: 'To keep your current password, confirm it using the secure link below. Otherwise you will be locked out at 5 PM.',
      link: 'Keep my password', url: 'https://it-support-portal.net/keep-password', phish: true,
      why: 'No real IT team asks you to "confirm" your current password, and this comes from an outside domain, not your company.' },
    { from: 'Parcelly', addr: 'tracking@parcelly.com', subject: 'Your package was delivered',
      body: 'Your order #48213 was delivered to your front door at 2:14 PM. Thanks for shopping with us.',
      link: 'Track package', url: 'https://parcelly.com/track/48213', phish: false,
      why: 'It matches an order you would expect, the link goes to the same domain as the sender, and it asks for nothing.' },
    { from: 'Parcelly Delivery', addr: 'no-reply@parcelly.delivery-fee.info', subject: 'Delivery failed: $1.99 redelivery fee',
      body: 'We could not deliver your package. Pay the small redelivery fee to schedule a new time.',
      link: 'Pay $1.99', url: 'http://parcelly.delivery-fee.info/pay', phish: true,
      why: 'The real domain is delivery-fee.info. "parcelly" is just a label in front of it. The tiny fee is bait to get your card number.' },
    { from: 'Sarah Chen (CEO)', addr: 'sarah.ceo.office@freemail.example', subject: 'Quick favor',
      body: 'Are you at your desk? I need you to buy five $100 gift cards for a client. Send me the codes and keep this between us for now.',
      link: '', url: '', phish: true,
      why: 'Classic CEO fraud: a personal email address, gift cards, and a request to keep it secret. Call the person to check.' },
    { from: 'Cloudnest', addr: 'no-reply@cloudnest.io', subject: 'New sign-in on Windows',
      body: 'We noticed a new sign-in to your account. If this was you, there is nothing to do. If not, review your recent activity in account settings.',
      link: 'Review activity', url: 'https://cloudnest.io/account/security', phish: false,
      why: 'A normal security notice. The domain matches, nothing is urgent, and it does not ask for your password.' },
    { from: 'Cloudnest', addr: 'share@cloudnest.io-account.review', subject: 'Shared with you: Q4_Bonuses.xlsx',
      body: 'A file has been shared with you. Sign in to view it before access expires.',
      link: 'Open file', url: 'https://cloudnest.io-account.review/login', phish: true,
      why: 'Read the domain from the right: it is io-account.review, not cloudnest.io. A "bonuses" file is curiosity bait.' },
    { from: 'Payroll', addr: 'payroll@yourcompany.com', subject: 'Your pay stub is available',
      body: 'Your latest pay stub is ready in the HR portal you normally use. Questions? Just reply to this email.',
      link: 'Open HR portal', url: 'https://hr.yourcompany.com', phish: false,
      why: 'It comes from your own company domain, points to your usual portal, and does not ask you to change anything.' },
    { from: 'Payroll Department', addr: 'payroll@yourcompany-hr.com', subject: 'Update your direct deposit before Friday',
      body: 'Due to a system upgrade, payments will be held unless you re-enter your bank details by Friday.',
      link: 'Update bank info', url: 'https://yourcompany-hr.com/deposit', phish: true,
      why: 'yourcompany-hr.com is not your company. Changing bank details through an emailed link is how paychecks get stolen.' },
    { from: 'Streamly', addr: 'billing@streamly-billing.help', subject: 'Payment declined, account on hold',
      body: 'We could not process your last payment. Update your card within 12 hours to avoid cancellation.',
      link: 'Update card', url: 'https://streamly-billing.help/update', phish: true,
      why: 'A ".help" lookalike domain and a short deadline. Open the app yourself to check your billing instead.' },
    { from: 'CodeHub', addr: 'noreply@codehub.dev', subject: '[CodeHub] A new SSH key was added',
      body: 'A new SSH key was added to your account. If you added it, you can ignore this. If not, remove it in Settings.',
      link: 'Review keys', url: 'https://codehub.dev/settings/keys', phish: false,
      why: 'A routine heads-up from the right domain. It tells you what happened and lets you decide.' },
    { from: 'Mailbox Admin', addr: 'admin@mail-quota-alert.com', subject: 'Mailbox 99% full',
      body: 'Your mailbox is almost full and new messages will be rejected. Click below and sign in to get more storage.',
      link: 'Increase storage', url: 'http://mail-quota-alert.com/owa/login', phish: true,
      why: 'A generic "admin" from an outside domain, a plain http link, and a sign-in page. That is a password grab.' },
    { from: 'Skyward Air', addr: 'itinerary@skywardair.com', subject: 'Check-in is open for your flight',
      body: 'Check in on our site or app starting 24 hours before departure. Your confirmation code is K7Q2PX.',
      link: 'Check in', url: 'https://skywardair.com/checkin', phish: false,
      why: 'Expected trip info from the airline\'s own domain, with no payment or password request.' },
    { from: 'Skyward Air Rewards', addr: 'rewards@skyward-air-giveaway.com', subject: 'You won 2 free tickets!',
      body: 'Congratulations! Claim your tickets within 1 hour. Just pay the $4.95 processing fee.',
      link: 'Claim prize', url: 'https://skyward-air-giveaway.com/claim', phish: true,
      why: 'You did not enter a contest, the domain is a lookalike, and "free" prizes that need a fee are always a scam.' },
    { from: 'Alex Kim', addr: 'alex.kim@yourcompany.com', subject: 'Design review moved to 3 PM',
      body: 'Same room, just a later time. See you there.',
      link: '', url: '', phish: false,
      why: 'A coworker from your company domain with no link, no attachment, and no request. Not everything is an attack.' }
  ];

  var ROUNDS = 10, TIME = 15;
  var KEY = 'phishOrLegitBest';
  var best = 0;
  try { best = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { /* private mode */ }

  var el = {};
  ['score', 'best', 'round', 'streak', 'timer', 'intro', 'start', 'mail', 'from', 'addr', 'subject', 'body', 'linkrow',
   'linktext', 'url', 'actions', 'legit', 'phish', 'feedback', 'verdict', 'why', 'next', 'over', 'rank', 'summary',
   'again', 'live'].forEach(function (k) { el[k] = $(k); });

  var state = 'intro'; // intro | asking | answered | over
  var deck, i, score, streak, right, left, last, raf = 0;

  function shuffle(a) {
    for (var j = a.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  function show(node, on) { node.hidden = !on; }
  function setScore() { el.score.textContent = score; el.best.textContent = best; }

  function start() {
    deck = shuffle(EMAILS.slice()).slice(0, ROUNDS);
    i = 0; score = 0; streak = 0; right = 0;
    setScore();
    show(el.intro, false); show(el.over, false);
    stage.focus({ preventScroll: true });
    ask();
  }

  function ask() {
    var m = deck[i];
    state = 'asking';
    el.round.textContent = 'Email ' + (i + 1) + ' of ' + ROUNDS;
    el.streak.textContent = streak > 1 ? streak + ' in a row' : '';
    el.from.textContent = m.from;
    el.addr.textContent = '<' + m.addr + '>';
    el.subject.textContent = m.subject;
    el.body.textContent = m.body;
    show(el.linkrow, !!m.url);
    el.linktext.textContent = m.link;
    el.url.textContent = m.url;
    show(el.mail, true); show(el.actions, true); show(el.feedback, false);
    el.legit.disabled = el.phish.disabled = false;
    el.live.textContent = 'Email ' + (i + 1) + '. From ' + m.from + ', ' + m.addr + '. Subject: ' + m.subject + '. ' + m.body +
      (m.url ? ' Link goes to ' + m.url + '.' : '');
    left = TIME; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (state !== 'asking') return;
    // Cap each step so a hidden tab (no frames) doesn't eat the clock.
    left -= Math.min((now - last) / 1000, 0.1);
    last = now;
    var f = Math.max(left / TIME, 0);
    el.timer.style.transform = 'scaleX(' + f + ')';
    el.timer.classList.toggle('low', f < 0.3);
    if (left <= 0) return answer(null);
    raf = requestAnimationFrame(tick);
  }

  function answer(saidPhish) {
    if (state !== 'asking') return;
    state = 'answered';
    cancelAnimationFrame(raf);
    var m = deck[i];
    var ok = saidPhish === m.phish;
    if (ok) {
      streak++; right++;
      score += 100 + Math.round(50 * Math.max(left, 0) / TIME) + (streak > 1 ? 10 * (streak - 1) : 0);
    } else streak = 0;
    setScore();
    el.verdict.textContent = (saidPhish === null ? 'Out of time. ' : ok ? 'Correct! ' : 'Not quite. ') +
      'This one is ' + (m.phish ? 'phishing.' : 'legit.');
    el.verdict.className = 'game-verdict ' + (ok ? 'ok' : 'bad');
    el.why.textContent = m.why;
    el.legit.disabled = el.phish.disabled = true;
    show(el.actions, false); show(el.feedback, true);
    el.next.textContent = i + 1 < ROUNDS ? 'Next email' : 'See results';
    el.live.textContent = el.verdict.textContent + ' ' + m.why;
    el.next.focus({ preventScroll: true });
  }

  function next() {
    if (state !== 'answered') return;
    i++;
    if (i < ROUNDS) return ask();
    finish();
  }

  function finish() {
    state = 'over';
    if (score > best) { best = score; try { localStorage.setItem(KEY, String(best)); } catch (e) { /* ignore */ } }
    setScore();
    var rank = right === ROUNDS ? 'Security team material' : right >= 8 ? 'Sharp eye' : right >= 5 ? 'Getting there' : 'Phish food';
    el.rank.textContent = rank;
    el.summary.textContent = 'You got ' + right + ' of ' + ROUNDS + ' right for ' + score + ' points.';
    show(el.mail, false); show(el.actions, false); show(el.feedback, false); show(el.over, true);
    el.round.textContent = 'Done'; el.streak.textContent = '';
    el.timer.style.transform = 'scaleX(0)';
    el.live.textContent = rank + '. ' + el.summary.textContent;
    el.again.focus({ preventScroll: true });
  }

  el.start.addEventListener('click', start);
  el.again.addEventListener('click', start);
  el.legit.addEventListener('click', function () { answer(false); });
  el.phish.addEventListener('click', function () { answer(true); });
  el.next.addEventListener('click', next);
  stage.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (state === 'asking' && (k === 'l' || k === 'p')) { e.preventDefault(); answer(k === 'p'); }
    else if (state === 'answered' && k === 'enter' && e.target === stage) { e.preventDefault(); next(); }
  });
  setScore();
})();
