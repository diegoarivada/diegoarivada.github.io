# UltroBot live status

How the website knows whether UltroBot is awake, without ever talking to the home PC.

## Why not just ping the dashboard?

The dashboard is public at the Tailscale Funnel URL, so the site could `fetch()` it. That has three problems:

1. When the PC is asleep, the request hangs until it times out. The pill would spin for seconds on every page load.
2. It needs a new unauthenticated endpoint on the home server, plus CORS, plus the Funnel URL in every page's CSP.
3. There's no way to show "last seen awake" because a sleeping server can't answer.

## Design

```
UltroLab Server (UltroBot)                 Cloudflare Worker (free)                 diegoarivada.dev
┌──────────────────────────┐  POST /beat   ┌──────────────────────────┐  GET /status ┌──────────────────┐
│ orchestrator/site_beacon │ ────────────► │ verify HMAC + timestamp  │ ◄─────────── │ ultrobot-status.js│
│ every 5 min while awake  │  signed JSON  │ store latest beat in KV  │  JSON, 60s   │ sets awake/asleep │
│ + one "sleeping" beat    │               │ online = beat < 7 min    │  edge cache  │ renders robot     │
│   right before sleep     │               │ CORS: diegoarivada.dev   │              │                   │
└──────────────────────────┘               └──────────────────────────┘              └──────────────────┘
```

- **Awake**: last beat is under 7 minutes old and its `state` is `awake`.
- **Asleep**: last beat says `sleeping` (sent by the `/power sleep` and dashboard Sleep handlers right before sleeping), or the last beat is older than 7 minutes (crash, power cut, network down).
- **Unknown**: the Worker itself can't be reached. The site shows the asleep look with "Status unavailable" so it never looks broken.

## Heartbeat payload

```json
{
  "v": 1,
  "state": "awake",
  "sent_at": "<unix seconds>",
  "stats": { "tasks_done": 128, "scripts_drafted": 3, "uptime_s": 15120 },
  "studio": { "outline": "done", "script": "done", "facts": "done", "voice": "doing", "render": "todo" },
  "shipped": [ { "title": "Passkey and Discord push sign-in for the Board", "lane": "claude", "date": "2026-11-03" } ]
}
```

Only counts, Studio stage names, and Board cards with the new `public` flag. No users, chats, file names, IPs, or hostnames. Titles are trimmed to 90 characters and rendered with `textContent`, never `innerHTML`.

## Security

- **Signed beats**: header `X-Beat-Signature: sha256=<hex>` is an HMAC-SHA256 over `sent_at + "." + body`, keyed with `BEAT_SECRET`. The Worker uses a constant-time compare.
- **Replay protection**: reject beats with `sent_at` more than 5 minutes off the Worker's clock, and any `sent_at` not newer than the stored one.
- **Secret handling**: `BEAT_SECRET` lives in `wrangler secret put` on the Worker and in UltroBot's `.env` / secret store. Never in the repo, logs, or Discord.
- **Size and shape limits**: body capped at 8 KB, strict schema check, at most 6 shipped cards.
- **Read side**: `GET /status` is public, read-only, `Cache-Control: max-age=60`, CORS allows `https://diegoarivada.dev` and `https://diegoarivada.github.io` only.
- **CSP**: pages add the Worker origin to `connect-src`, nothing else.
- **Outbound only**: the home server makes an outbound HTTPS call. No new inbound port, route, or Funnel path.

## Free tier fit

Workers KV free tier allows 1,000 writes a day. One beat every 5 minutes is 288 writes a day, plus a handful of sleep beats. Reads are cached at the edge for 60 seconds.

## Site behavior

- `ultrobot-status.js` fetches with a 4 second timeout, then sets `awake` or `asleep` on `<html>`. CSS does the rest.
- First paint uses the last known state from `localStorage` so the pill doesn't flash.
- Re-checks every 2 minutes while the tab is visible.
- With reduced motion on, animations stop but the closed eyes and "z z" still show it's asleep.

## Tests

- Worker: `node --test` covers good signature, bad signature, old timestamp, replay, oversize body, stale beat turns into asleep, CORS headers.
- UltroBot: unit test that the beacon payload never includes fields outside the allow list.
