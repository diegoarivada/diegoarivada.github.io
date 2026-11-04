# diegoarivada.dev v2: Blueprint

Status: **approved Nov 3, 2026** (mockups posted to Discord #📦・agent-results), with one change: no floating chips or animation over the portrait. Phases 1 to 5 are built on the `website-v2` branch. The Worker goes live once it's deployed to Cloudflare (see the README).

## 1. Goal

Make the site faster and better looking, and bring UltroBot onto it so visitors can see the bot is real, what it's doing, and whether it's awake. Keep everything Diego already likes: the blue to red brand, Rubik, dark mode, the strict security posture, and GitHub Pages hosting.

## 2. What we keep from the current site

| Keep | Why |
|---|---|
| Brand colors `#0a66c2` / `#e63946` / `#1d3557` and the blue to red gradient | It's recognizable and UltroBot's dashboard already uses the same tokens. |
| Self-hosted Rubik | No third-party font requests, keeps the CSP tight. |
| Per-page CSP meta, no `unsafe-inline` | Core to the security page's "try to break this site" story. |
| CodeQL, ZAP baseline, pinned Actions, Dependabot, `security.txt` | Already solid. |
| Content: experience, education, EarDeck, security lab, homelab case study, pictures, YouTube | Content stays. Only layout and polish change. |
| Dark mode toggle with saved preference | Users expect it. |
| Typing effect, scroll progress, reveal on scroll | Small touches that already work. Restyled, not removed. |

## 3. What changes

1. **One sticky glass top bar** on every page. Replaces the dropdown plus the duplicate anchor nav plus the floating theme button. Collapses to a menu button on phones.
2. **New hero**: name, a one-line hook, role, three CTAs (Hire me, Resume, See my work), stat row, portrait card with floating credential chips. Soft animated color orbs instead of the clipped gradient banner.
3. **Bento project grid** instead of stacked sections. UltroBot gets the big tile with its live robot.
4. **Experience timeline**, **skill chips grouped in three cards**, **contact split into socials plus form**.
5. **UltroBot page rebuilt** around the live status: night sky and sleeping robot when the server is down, bright gradient and blinking robot when it's up.
6. **Performance pass** (see [PERFORMANCE.md](PERFORMANCE.md)): the pictures page alone ships 12.7 MB of photos today.

## 4. UltroBot plus website: combined features

| # | Feature | Where | Data source |
|---|---|---|---|
| 1 | **Status pill** with a mini robot (online dot or floating "z z") | Top bar, every page | Status Worker |
| 2 | **Sleeping animation**: closed eyes, dim antenna, slow breathing, floating Zzz, stars and moon | UltroBot hero and home tile | Status Worker |
| 3 | **Live stats**: tasks completed, video scripts drafted, uptime, last seen awake | UltroBot hero | Heartbeat payload |
| 4 | **Recently shipped feed** from the 📋 Board, only cards marked `public` | UltroBot page | Heartbeat payload |
| 5 | **Studio progress pipeline** (Outline, Script, Fact checklist, Voice, Render) | UltroBot page | Heartbeat payload |
| 6 | **Shared design tokens** so the dashboard and the site look like one product | `tokens.css` copied into `orchestrator/static/` | Build step |
| 7 | **Invite request** button that pre-fills the contact form subject with "UltroBot invite" | UltroBot page | Formspree (existing) |

Not doing on purpose: a public "wake it up" button (anyone on the internet could wake the PC), and any public chat with the model (abuse and cost of power). Both stay behind UltroBot's sign-in.

How the status works is in [ULTROBOT_STATUS.md](ULTROBOT_STATUS.md). Short version: the UltroLab Server sends a signed heartbeat to a free Cloudflare Worker, and the site asks the Worker. The site never talks to the home PC directly, so a sleeping server never makes the page hang, and no new public endpoint is opened on the home network.

## 5. Stack trade study

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Plain HTML, CSS, vanilla JS (ES modules)** | Zero build, GitHub Pages serves it as is, easiest to keep a strict CSP, nothing to patch | Shared header is copy-pasted across pages | **Pick this.** A tiny Node script stamps the shared header and footer into each page so there's one source of truth. |
| Astro (static output) | Components, image pipeline built in | Needs a GitHub Actions build and deploy, more dependencies to pin and audit | Good, but more moving parts than this site needs |
| React + Vite | Diego's default for web apps | It's a content site, not an app. Ships JS for static text. | No |
| Jekyll (Pages native) | Built into Pages | Ruby, Liquid, `.nojekyll` already set to serve `.well-known` | No |

Supporting pieces:

- **Status Worker**: Cloudflare Workers free tier, plain JS, `wrangler`, tests with `node --test`. Secret via `wrangler secret put`.
- **Heartbeat sender**: a small Python module inside UltroBot (`orchestrator/site_beacon.py`), since UltroBot is Python.
- **Build helpers**: `tools/build.mjs` (stamp partials, minify CSS) and `tools/optimize-images.mjs` (`sharp`, pinned). Run locally or in a Pages Action. `node_modules` stays out of git.

## 6. File structure (target)

```
diegoarivada.github.io/
├── index.html, coding.html, homelab.html, homelab-case-study.html,
│   security.html, pictures.html, youtube.html, agents.html, thankyou.html
├── assets/
│   ├── css/
│   │   ├── tokens.css          # colors, radius, shadow, motion (shared with UltroBot)
│   │   └── site.css            # layout and components
│   ├── js/
│   │   ├── site.js             # nav, theme, reveal, typing
│   │   ├── ultrobot-status.js  # fetch status, set awake/asleep, render robot
│   │   └── security.js         # unchanged behavior
│   ├── img/                    # optimized AVIF/WebP + JPEG fallbacks, sized variants
│   └── fonts/                  # Rubik (OFL)
├── partials/                   # header.html, footer.html (stamped in by tools/build.mjs)
├── tools/
│   ├── build.mjs
│   └── optimize-images.mjs
├── worker/                     # Cloudflare status Worker
│   ├── src/index.js
│   ├── test/index.test.js
│   └── wrangler.toml
├── docs/
│   ├── BLUEPRINT.md            # this file
│   ├── DESIGN_SYSTEM.md
│   ├── ULTROBOT_STATUS.md
│   ├── PERFORMANCE.md
│   └── mockups/                # approved mockups and screenshots
├── .github/workflows/          # CodeQL, ZAP, photo-privacy (kept), + worker tests
├── .well-known/security.txt
├── robots.txt, sitemap.xml     # new
└── README.md, SECURITY.md, LICENSE
```

Old paths (`styles.css`, `profile.JPG`, `images/…`) keep working for one release through the new files, so outside links don't break.

## 7. Phases

| Phase | Work | Done when |
|---|---|---|
| 0 | Mockups and blueprint | Diego approves in Discord |
| 1 | Design system: `tokens.css`, components, shared header and footer | Every page uses the new top bar, both themes pass contrast |
| 2 | Page rebuilds: home, UltroBot, then the rest | Content matches today's, mobile has no sideways scroll |
| 3 | Performance pass | Lighthouse 95+ on all four categories, mobile |
| 4 | Status Worker and heartbeat | Pill flips to sleeping within 1 minute of `/power sleep` |
| 5 | Feed, stats, Studio pipeline, dashboard token sync | Public Board cards show on the site |
| 6 | Ship | PR merged after CodeQL and ZAP pass, live on diegoarivada.dev |

## 8. Guard rails

- Every change goes through a PR on a branch. Auto-merge is off for this repo.
- CSP gets exactly one new origin: the Worker, in `connect-src`. Nothing else.
- The heartbeat only carries counts and cards Diego marked public. No usernames, chats, file names, IPs, or hostnames.
- `prefers-reduced-motion` turns every animation off, and the sleeping robot still reads as asleep (closed eyes, visible Zzz).
- No mention of specific GPU or model names in user-facing text.
