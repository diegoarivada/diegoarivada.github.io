// UltroBot status Worker (Cloudflare Workers, free tier).
//
// POST /beat    UltroBot sends a signed heartbeat every 5 minutes while awake, plus one "sleeping" beat
//               right before the PC sleeps. Signature: HMAC-SHA256(BEAT_SECRET, `${timestamp}.${body}`).
// GET  /status  The website reads the latest state. Public, read-only, cached for 60 seconds.
//
// Everything in a beat is treated as data: only allow-listed fields are kept, with types and lengths checked.

const MAX_BODY = 8 * 1024;
const MAX_SKEW_S = 300;          // reject beats more than 5 minutes off our clock
const STALE_AFTER_S = 7 * 60;    // no beat for 7 minutes means asleep
const STAGES = ['outline', 'script', 'facts', 'voice', 'render'];
const STAGE_VALUES = new Set(['done', 'doing', 'todo']);
const LANES = new Set(['claude', 'copilot', 'diego']);
const KEY = 'latest';

const enc = new TextEncoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...extra,
    },
  });
}

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin');
  const headers = { vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'GET';
    headers['access-control-max-age'] = '86400';
  }
  return headers;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const nonNegInt = v => (Number.isInteger(v) && v >= 0 && v < 1e12 ? v : null);
const cleanText = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

// Returns a cleaned beat, or null if the shape is wrong.
export function sanitizeBeat(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  if (raw.state !== 'awake' && raw.state !== 'sleeping') return null;
  const sentAt = nonNegInt(raw.sent_at);
  if (sentAt === null) return null;

  const s = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const stats = {
    tasks_done: nonNegInt(s.tasks_done),
    scripts_drafted: nonNegInt(s.scripts_drafted),
    uptime_s: nonNegInt(s.uptime_s),
  };

  let studio = null;
  if (raw.studio && typeof raw.studio === 'object') {
    studio = {};
    for (const stage of STAGES) studio[stage] = STAGE_VALUES.has(raw.studio[stage]) ? raw.studio[stage] : 'todo';
  }

  const shipped = Array.isArray(raw.shipped)
    ? raw.shipped.slice(0, 6).map(c => ({
        title: cleanText(c && c.title, 90),
        lane: LANES.has(c && c.lane) ? c.lane : 'diego',
        date: typeof (c && c.date) === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : '',
      })).filter(c => c.title)
    : [];

  return { state: raw.state, sent_at: sentAt, stats, studio, shipped };
}

export function publicStatus(stored, nowS) {
  if (!stored) return { state: 'asleep', last_seen: null, stats: {}, studio: null, shipped: [] };
  const fresh = nowS - stored.sent_at <= STALE_AFTER_S;
  const awake = stored.state === 'awake' && fresh;
  return {
    state: awake ? 'awake' : 'asleep',
    last_seen: awake ? stored.sent_at : (stored.last_awake || null),
    stats: stored.stats || {},
    studio: stored.studio || null,
    shipped: stored.shipped || [],
  };
}

async function handleBeat(request, env, nowS) {
  // Trim, because a secret piped in from PowerShell can pick up a trailing line break.
  const secret = (env.BEAT_SECRET || '').trim();
  if (!secret) return json({ error: 'not configured' }, 503);
  const ts = request.headers.get('x-beat-timestamp') || '';
  const sig = (request.headers.get('x-beat-signature') || '').replace(/^sha256=/, '');
  if (!/^\d{1,12}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return json({ error: 'unauthorized' }, 401);

  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return json({ error: 'too large' }, 413);
  const body = await request.text();
  if (enc.encode(body).length > MAX_BODY) return json({ error: 'too large' }, 413);

  const expected = await hmacHex(secret, `${ts}.${body}`);
  if (!safeEqual(expected, sig)) return json({ error: 'unauthorized' }, 401);
  if (Math.abs(nowS - Number(ts)) > MAX_SKEW_S) return json({ error: 'stale' }, 401);

  let parsed;
  try { parsed = JSON.parse(body); } catch { return json({ error: 'bad json' }, 400); }
  const beat = sanitizeBeat(parsed);
  if (!beat || String(beat.sent_at) !== ts) return json({ error: 'bad beat' }, 400);

  const prev = await env.STATUS.get(KEY, 'json');
  if (prev && beat.sent_at <= prev.sent_at) return json({ error: 'replay' }, 409);

  const lastAwake = beat.state === 'awake' ? beat.sent_at : (prev && prev.state === 'awake' ? prev.sent_at : (prev && prev.last_awake) || null);
  await env.STATUS.put(KEY, JSON.stringify({ ...beat, last_awake: lastAwake }));
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const nowS = Math.floor(Date.now() / 1000);

    if (url.pathname === '/beat' && request.method === 'POST') return handleBeat(request, env, nowS);

    if (url.pathname === '/status') {
      const cors = corsHeaders(request, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
      const stored = await env.STATUS.get(KEY, 'json');
      return json(publicStatus(stored, nowS), 200, { ...cors, 'cache-control': 'public, max-age=60' });
    }

    return json({ error: 'not found' }, 404);
  },
};
