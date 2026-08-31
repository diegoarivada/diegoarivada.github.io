/**
 * site.js — shared interactive effects for diegoarivada.github.io
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
