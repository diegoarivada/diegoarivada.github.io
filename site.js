/**
 * site.js — shared interactive effects for diegoarivada.github.io
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─────────────────────────────────────────────────────
  // 0. Page basics: navigation, theme, progress, reveal
  // ─────────────────────────────────────────────────────
  const dropdown = document.getElementById('pageDropdown');
  if (dropdown) {
    let currentPage = window.location.pathname.split('/').pop().split('?')[0];
    if (currentPage === '') currentPage = 'index.html';
    dropdown.value = currentPage;
    dropdown.addEventListener('change', () => {
      if (dropdown.value) window.location.href = dropdown.value;
    });
  }

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggleBtn.textContent = '☀️';
    } else {
      toggleBtn.textContent = '🌙';
    }

    toggleBtn.addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        toggleBtn.textContent = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        toggleBtn.textContent = '☀️';
      }
    });
  }

  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) progressBar.style.width = (window.scrollY / total * 100) + '%';
    }, { passive: true });
  }

  if (!reducedMotion) {
    const sections = document.querySelectorAll('main section');
    sections.forEach(s => s.classList.add('reveal'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    sections.forEach(s => io.observe(s));
  }

  // Typing effect for the home page subtitle
  const subtitleEl = document.querySelector('header > p[data-typing]');
  if (subtitleEl && !reducedMotion) {
    const roles = [
      'Product Security Engineer | Backup Team Lead',
      'Securing Aircraft Systems @ Boeing',
      'Systems Engineering @ USC',
      'Vulnerability Management',
    ];
    let roleIndex = 0;
    let charIndex = roles[0].length;
    let deleting = true;

    const textSpan = document.createElement('span');
    textSpan.textContent = roles[0];
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    subtitleEl.textContent = '';
    subtitleEl.appendChild(textSpan);
    subtitleEl.appendChild(cursor);

    function typeStep() {
      const current = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        textSpan.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          setTimeout(() => { deleting = true; typeStep(); }, 2200);
          return;
        }
        setTimeout(typeStep, 72);
      } else {
        charIndex--;
        textSpan.textContent = current.slice(0, charIndex);
        if (charIndex <= 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          setTimeout(typeStep, 350);
          return;
        }
        setTimeout(typeStep, 40);
      }
    }

    setTimeout(typeStep, 2800);
  }

  // AJAX contact form submission (spinner + success)
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!submitBtn) return;

      submitBtn.disabled = true;
      const originalContent = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="btn-spinner"><span class="spinner" aria-hidden></span>Sending…</span>';

      try {
        const formData = new FormData(contactForm);
        const resp = await fetch(contactForm.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        });

        if (resp.ok) {
          submitBtn.innerHTML = '<span class="btn-spinner"><svg class="success-check" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2 9 19 20 8l-1.4-1.4z"></path></svg>Sent</span>';
          setTimeout(() => {
            window.location.href = '/thankyou.html';
          }, 1100);
        } else {
          const data = await resp.json().catch(() => ({}));
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalContent;
          alert(data.error || 'Submission failed — please try again.');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalContent;
        alert('Network error — please try again.');
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // 1. Click ripple on buttons and links
  // ─────────────────────────────────────────────────────
  function createRipple(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-fx';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;

    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }

    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  document
    .querySelectorAll('.links-cta, .links a, .project-links a, .anchor-nav a, button:not(#theme-toggle)')
    .forEach(el => el.addEventListener('click', createRipple));

  if (!reducedMotion) {

    // ─────────────────────────────────────────────────────
    // 2. Particle constellation canvas in header
    // ─────────────────────────────────────────────────────
    const header = document.querySelector('header');
    if (header) {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.22;z-index:0;';

      if (getComputedStyle(header).position === 'static') {
        header.style.position = 'relative';
      }
      header.insertBefore(canvas, header.firstChild);

      // Keep all other header children rendered above the canvas
      Array.from(header.children).forEach(child => {
        if (child !== canvas) child.style.position = 'relative';
      });

      const ctx = canvas.getContext('2d');
      const N = 50;
      const pts = [];

      function resizeCanvas() {
        canvas.width = header.offsetWidth;
        canvas.height = header.offsetHeight;
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas, { passive: true });

      for (let i = 0; i < N; i++) {
        pts.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 1.6 + 0.6,
        });
      }

      function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const dx = pts[i].x - pts[j].x;
            const dy = pts[i].y - pts[j].y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 85) {
              ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - d / 85)})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[j].x, pts[j].y);
              ctx.stroke();
            }
          }
        }

        pts.forEach(p => {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });

        requestAnimationFrame(animateParticles);
      }
      animateParticles();
    }

    // ─────────────────────────────────────────────────────
    // 3. 3D perspective tilt on section cards
    // ─────────────────────────────────────────────────────
    document.querySelectorAll('main section').forEach(section => {
      section.addEventListener('mousemove', e => {
        const rect = section.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        section.style.transform =
          `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-4px)`;
        section.style.boxShadow = '0 20px 50px rgba(0,0,0,0.14)';
      });
      section.addEventListener('mouseleave', () => {
        section.style.transform = '';
        section.style.boxShadow = '';
      });
    });

    // ─────────────────────────────────────────────────────
    // 4. Staggered list item reveal on scroll
    // ─────────────────────────────────────────────────────
    document.querySelectorAll('main section li:not(.skill-list li)').forEach(li => {
      li.classList.add('list-item-reveal');
    });

    const listObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('.list-item-reveal').forEach((li, i) => {
            setTimeout(() => li.classList.add('list-item-visible'), i * 70);
          });
          listObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('main section').forEach(s => listObserver.observe(s));

    // ─────────────────────────────────────────────────────
    // 5. Magnetic hover pull on CTA buttons
    // ─────────────────────────────────────────────────────
    document.querySelectorAll('.links-cta, .project-links a').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
        btn.style.transform = `translate(${x}px, ${y}px) translateY(-2px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });

  }

})();
