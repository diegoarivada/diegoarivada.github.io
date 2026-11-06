import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import worker, { sanitizeBeat, publicStatus } from '../src/index.js';

const SECRET = 'test-secret-not-real';
const ORIGIN = 'https://diegoarivada.dev';

function kv() {
  const m = new Map();
  return {
    async get(k, type) { const v = m.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); },
  };
}
const env = () => ({ STATUS: kv(), BEAT_SECRET: SECRET, ALLOWED_ORIGINS: `${ORIGIN},https://diegoarivada.github.io` });
const now = () => Math.floor(Date.now() / 1000);

function beat(payload, { ts = payload.sent_at, secret = SECRET, body = JSON.stringify(payload) } = {}) {
  const sig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  return new Request('https://status.example/beat', {
    method: 'POST',
    headers: { 'x-beat-timestamp': String(ts), 'x-beat-signature': `sha256=${sig}`, 'content-type': 'application/json' },
    body,
  });
}
const status = (origin = ORIGIN) => new Request('https://status.example/status', { headers: origin ? { origin } : {} });
const awakeBeat = (t = now(), extra = {}) => ({ v: 1, state: 'awake', sent_at: t, stats: { tasks_done: 5, scripts_drafted: 2, uptime_s: 60 }, ...extra });

test('a good beat is stored and status reads awake', async () => {
  const e = env();
  assert.equal((await worker.fetch(beat(awakeBeat()), e)).status, 200);
  const res = await worker.fetch(status(), e);
  const data = await res.json();
  assert.equal(data.state, 'awake');
  assert.equal(data.stats.tasks_done, 5);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
});

test('wrong secret is rejected', async () => {
  const e = env();
  assert.equal((await worker.fetch(beat(awakeBeat(), { secret: 'nope' }), e)).status, 401);
  assert.equal((await (await worker.fetch(status(), e)).json()).state, 'offline');
});

test('tampered body is rejected', async () => {
  const e = env();
  const p = awakeBeat();
  const req = beat(p);
  const sig = req.headers.get('x-beat-signature');
  const forged = new Request(req.url, { method: 'POST', headers: { 'x-beat-timestamp': String(p.sent_at), 'x-beat-signature': sig }, body: JSON.stringify({ ...p, state: 'sleeping' }) });
  assert.equal((await worker.fetch(forged, e)).status, 401);
});

test('old timestamps are rejected', async () => {
  const e = env();
  assert.equal((await worker.fetch(beat(awakeBeat(now() - 3600)), e)).status, 401);
});

test('replaying the same beat is rejected', async () => {
  const e = env();
  const p = awakeBeat();
  assert.equal((await worker.fetch(beat(p), e)).status, 200);
  assert.equal((await worker.fetch(beat(p), e)).status, 409);
});

test('timestamp header must match the signed body', async () => {
  const e = env();
  const p = awakeBeat();
  assert.equal((await worker.fetch(beat(p, { ts: p.sent_at - 1 }), e)).status, 400);
});

test('oversize bodies are rejected', async () => {
  const e = env();
  const p = awakeBeat(now(), { pad: 'x'.repeat(9000) });
  assert.equal((await worker.fetch(beat(p), e)).status, 413);
});

test('a sleeping beat flips the state and keeps last seen', async () => {
  const e = env();
  const t = now() - 10;
  await worker.fetch(beat(awakeBeat(t)), e);
  await worker.fetch(beat({ v: 1, state: 'sleeping', sent_at: t + 5 }), e);
  const data = await (await worker.fetch(status(), e)).json();
  assert.equal(data.state, 'asleep');
  assert.equal(data.last_seen, t);
});

test('a stale beat reads as offline (the control server stopped beating)', () => {
  const t = now();
  assert.equal(publicStatus({ state: 'awake', sent_at: t - 3600, stats: {} }, t).state, 'offline');
  assert.equal(publicStatus({ state: 'sleeping', sent_at: t - 3600, stats: {} }, t).state, 'offline');
});

test('a fresh sleeping beat reads as asleep (control server up, GPU PC napping)', () => {
  const t = now();
  assert.equal(publicStatus({ state: 'sleeping', sent_at: t - 60, stats: {} }, t).state, 'asleep');
});

test('unknown origins get no CORS header', async () => {
  const e = env();
  const res = await worker.fetch(status('https://evil.example'), e);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('sanitizer drops unknown fields and bad values', () => {
  const out = sanitizeBeat({
    v: 1, state: 'awake', sent_at: 100, secret: 'leak', hostname: 'pc',
    stats: { tasks_done: -1, scripts_drafted: 'many', uptime_s: 30, ip: '10.0.0.1' },
    studio: { outline: 'done', voice: '<script>', extra: 'x' },
    shipped: [{ title: 'A'.repeat(200), lane: 'admin', date: 'yesterday' }, { title: '' }, ...Array(10).fill({ title: 'x', lane: 'claude', date: '2026-11-03' })],
  });
  assert.deepEqual(Object.keys(out).sort(), ['sent_at', 'shipped', 'state', 'stats', 'studio']);
  assert.equal(out.stats.tasks_done, null);
  assert.equal(out.stats.scripts_drafted, null);
  assert.equal(out.stats.ip, undefined);
  assert.equal(out.studio.voice, 'todo');
  assert.equal(out.studio.extra, undefined);
  assert.equal(out.shipped[0].title.length, 90);
  assert.equal(out.shipped[0].lane, 'diego');
  assert.equal(out.shipped[0].date, '');
  assert.ok(out.shipped.length <= 6);
});

test('other paths and methods are refused', async () => {
  const e = env();
  assert.equal((await worker.fetch(new Request('https://status.example/'), e)).status, 404);
  assert.equal((await worker.fetch(new Request('https://status.example/beat'), e)).status, 404);
  assert.equal((await worker.fetch(new Request('https://status.example/status', { method: 'DELETE' }), e)).status, 405);
});
