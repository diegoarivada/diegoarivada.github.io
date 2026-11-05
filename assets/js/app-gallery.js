// Screenshot galleries on apps.html. Each [data-gallery] rotates through its
// .slide figures with a directional wipe, pauses on hover or focus, and only
// auto-advances while it is on screen. Respects prefers-reduced-motion.
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(g) {
    const slides = Array.from(g.querySelectorAll('.slide'));
    if (slides.length < 2) return;
    const interval = Number(g.dataset.interval) || 5000;
    g.style.setProperty('--g-interval', `${interval}ms`);

    const dotsWrap = g.querySelector('.app-gallery-dots');
    const label = g.getAttribute('aria-label') || 'Screenshots';
    let cur = 0;
    let timer = 0;
    let leaveTimer = 0;
    let hovering = false;
    let focused = false;
    let inView = false;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'app-gallery-dot';
      b.setAttribute('aria-label', `${label}: show ${i + 1} of ${slides.length}`);
      b.addEventListener('click', () => go(i, i > cur ? 'next' : 'prev'));
      dotsWrap.appendChild(b);
      return b;
    });

    function paint(prev) {
      slides.forEach((s, i) => {
        s.classList.toggle('is-active', i === cur);
        s.classList.toggle('is-leaving', i === prev);
        s.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
        s.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
      });
      dots.forEach((d, i) => {
        if (i === cur) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      if (prev !== undefined) {
        g.classList.remove('is-changing');
        void g.offsetWidth; // restart the sweep animation
        g.classList.add('is-changing');
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => slides[prev].classList.remove('is-leaving'), 1000);
      }
    }

    function running() {
      return !reduce.matches && !hovering && !focused && inView && !document.hidden;
    }

    function schedule() {
      clearTimeout(timer);
      const run = running();
      g.classList.toggle('is-running', false);
      if (!run) return;
      void g.offsetWidth; // restart the progress fill on the active dot
      g.classList.add('is-running');
      timer = setTimeout(() => go(cur + 1, 'next'), interval);
    }

    function go(i, dir) {
      const next = (i + slides.length) % slides.length;
      if (next === cur) return;
      const prev = cur;
      cur = next;
      g.dataset.dir = dir;
      paint(prev);
      schedule();
    }

    g.querySelector('.app-gallery-nav.prev')?.addEventListener('click', () => go(cur - 1, 'prev'));
    g.querySelector('.app-gallery-nav.next')?.addEventListener('click', () => go(cur + 1, 'next'));

    g.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 'next'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, 'prev'); }
    });

    let startX = null;
    g.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    g.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    });

    g.addEventListener('mouseenter', () => { hovering = true; schedule(); });
    g.addEventListener('mouseleave', () => { hovering = false; schedule(); });
    g.addEventListener('focusin', () => { focused = true; schedule(); });
    g.addEventListener('focusout', (e) => {
      if (!g.contains(e.relatedTarget)) { focused = false; schedule(); }
    });
    document.addEventListener('visibilitychange', schedule);
    reduce.addEventListener?.('change', schedule);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries.some((en) => en.isIntersecting);
        schedule();
      }, { threshold: 0.35 }).observe(g);
    } else {
      inView = true;
    }

    paint();
    requestAnimationFrame(() => g.classList.add('is-ready'));
    schedule();
  }

  document.querySelectorAll('[data-gallery]').forEach(init);
})();
