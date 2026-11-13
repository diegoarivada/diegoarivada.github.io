// Shared page behavior for diegoarivada.dev: theme, menu, scroll effects, typing, contact form,
// resume preview, and the photo lightbox. No inline code anywhere, so the CSP never needs 'unsafe-inline'.
(function () {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // ---------- Theme ----------
  const themeBtn = document.getElementById('theme-toggle');
  function applyTheme(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    if (themeBtn) themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  const saved = store.get('theme');
  applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      store.set('theme', next);
    });
  }

  // ---------- Mobile menu ----------
  const menuBtn = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  if (menuBtn && nav) {
    const setOpen = open => {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  // ---------- Scroll progress ----------
  const progress = document.getElementById('scroll-progress');
  if (progress) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = total > 0 ? (window.scrollY / total * 100) + '%' : '0';
        ticking = false;
      });
    }, { passive: true });
  }

  // ---------- Reveal on scroll ----------
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('main .card, main .block-head, main .gallery figure, main .feature, main .skill-row, main .about');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(t => {
      if (t.getBoundingClientRect().top > window.innerHeight) {
        t.classList.add('reveal');
        io.observe(t);
      }
    });
  }

  // ---------- Typing effect ----------
  const typingEl = document.querySelector('[data-typing]');
  if (typingEl && !reducedMotion) {
    const roles = [
      'Product Security Engineer · Backup Team Lead',
      'Securing aircraft systems at Boeing',
      'Systems Architecting at USC',
      'Vulnerability management and threat modeling',
    ];
    const text = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    text.textContent = roles[0];
    typingEl.textContent = '';
    typingEl.append(text, cursor);
    let role = 0, chars = roles[0].length, deleting = true;
    const step = () => {
      const current = roles[role];
      if (!deleting) {
        text.textContent = current.slice(0, ++chars);
        if (chars >= current.length) { deleting = true; return setTimeout(step, 2200); }
        return setTimeout(step, 65);
      }
      text.textContent = current.slice(0, --chars);
      if (chars <= 0) { deleting = false; role = (role + 1) % roles.length; return setTimeout(step, 350); }
      setTimeout(step, 35);
    };
    setTimeout(step, 2800);
  }

  // ---------- Contact form ----------
  const form = document.querySelector('.contact-form');
  if (form) {
    const params = new URLSearchParams(location.search);
    if (params.get('invite') === 'ultrobot') {
      const subject = form.querySelector('input[name="_subject"]');
      const message = form.querySelector('textarea[name="message"]');
      if (subject) subject.value = 'UltroBot invite request';
      if (message && !message.value) message.value = "Hi Diego, I'd like an UltroBot invite. Here's a bit about me and what I'd use it for: ";
    }
    const btn = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-form-status]');
    const say = (msg, isError) => {
      if (!status) return;
      status.textContent = msg;
      status.className = isError ? 'form-error' : 'form-note';
    };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!btn) return;
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '';
      const wrap = document.createElement('span');
      wrap.className = 'btn-spinner';
      const spin = document.createElement('span');
      spin.className = 'spinner';
      spin.setAttribute('aria-hidden', 'true');
      wrap.append(spin, 'Sending…');
      btn.append(wrap);
      say('', false);
      try {
        const resp = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        if (resp.ok) {
          window.location.href = 'thankyou.html';
          return;
        }
        const data = await resp.json().catch(() => ({}));
        say(typeof data.error === 'string' ? data.error : 'That did not go through. Please try again.', true);
      } catch {
        say('Network error. Please try again, or email me directly.', true);
      }
      btn.disabled = false;
      btn.innerHTML = label;
    });
  }

  // ---------- Resume preview (loads the PDF only when asked) ----------
  const resumeBtn = document.querySelector('[data-resume-toggle]');
  const resumeFrame = document.getElementById('resume-frame');
  if (resumeBtn && resumeFrame) {
    resumeBtn.addEventListener('click', () => {
      if (!resumeFrame.querySelector('iframe')) {
        const iframe = document.createElement('iframe');
        iframe.src = 'resume.pdf';
        iframe.title = 'Resume preview';
        resumeFrame.append(iframe);
      }
      const show = resumeFrame.hidden;
      resumeFrame.hidden = !show;
      resumeBtn.setAttribute('aria-expanded', String(show));
      resumeBtn.lastChild.textContent = show ? ' Hide preview' : ' Preview resume';
    });
  }

  // ---------- Photo lightbox ----------
  const lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const img = lightbox.querySelector('img');
    const cap = lightbox.querySelector('p');
    document.querySelectorAll('[data-full]').forEach(btn => {
      btn.addEventListener('click', () => {
        const full = btn.dataset.full;
        if (!/^assets\/img\/photos\/[\w-]+\.(jpg|webp|avif)$/.test(full)) return;
        img.src = full;
        img.alt = btn.querySelector('img')?.alt || '';
        cap.textContent = btn.dataset.caption || '';
        lightbox.showModal();
      });
    });
    lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close(); });
  }
})();
