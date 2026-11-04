# Diego A. Rivada: Personal Website

Source for [diegoarivada.dev](https://diegoarivada.dev), served by GitHub Pages. It's plain HTML, CSS, and JavaScript with no framework and no build step on the server. It also shows live whether [UltroBot](https://diegoarivada.dev/agents.html), my self-hosted AI workspace, is awake or asleep.

## Pages

| Page | What's on it |
|---|---|
| `index.html` | About, projects, experience, skills, resume, contact form |
| `security.html` | Standards, the EarDeck threat model, and a live test that attacks this site |
| `coding.html` | Projects and earlier builds |
| `homelab.html`, `homelab-case-study.html` | Homelab overview and case study |
| `agents.html` | UltroBot, with live status, stats, Studio progress, and recently shipped work |
| `pictures.html` | Photo gallery with a lightbox |
| `youtube.html` | Latest videos |

## Common jobs

```bash
npm install          # once, only needed for the image script
npm run build        # stamp partials/ into every page and write each page's CSP + sitemap.xml
npm run check        # fails if a page is out of date (CI runs this)
npm run images       # rebuild assets/img from the original photos
npm run serve        # http://127.0.0.1:8080
```

Edit the header, footer, icons, or robot in `partials/`, then run `npm run build`. Never edit the stamped blocks between `<!-- build:name -->` markers in a page, because the next build overwrites them.

### UltroBot status Worker

```bash
cd worker
node --test                                   # tests
npx wrangler@4.157.0 login                    # once
npx wrangler@4.157.0 kv namespace create STATUS   # once, paste the id into wrangler.toml
npx wrangler@4.157.0 deploy
```

Then run `scripts\set-beat-secret.ps1` in the UltroBot repo. It creates the shared secret and gives it to both sides without showing it. Finally, put the Worker URL in `site.config.json` (`statusUrl`, ending in `/status`) and in UltroBot's `config/platform.toml` (`[site] beat_url`, ending in `/beat`), then `npm run build`. See [docs/ULTROBOT_STATUS.md](docs/ULTROBOT_STATUS.md).

## Structure

```
├── *.html                  # pages (header, footer, icons, CSP stamped in by tools/build.mjs)
├── site.config.json        # page list, per-page CSP, UltroBot status URL
├── partials/               # header, footer, icon sprite, robot SVG
├── assets/
│   ├── css/tokens.css      # colors, radius, shadows (shared with the UltroBot dashboard)
│   ├── css/site.css        # layout and components
│   ├── js/                 # theme-init, site, ultrobot-status, security
│   ├── img/                # optimized AVIF/WebP/JPEG (no EXIF), og.jpg
│   └── fonts/              # self-hosted Rubik (SIL OFL)
├── worker/                 # Cloudflare Worker for UltroBot's live status
├── tools/                  # build.mjs, optimize-images.mjs, og-card.html
├── docs/                   # blueprint, design system, status design, performance, mockups
├── images/                 # original photos and SVG diagrams
├── .well-known/security.txt
└── robots.txt, sitemap.xml, CNAME, resume.pdf, favicon.ico
```

## Security notes

- Every page sets its own Content Security Policy in a meta tag, because GitHub Pages can't send custom headers. The policies live in `site.config.json`, and the build writes them. Keep all scripts and styles in files, or the policy blocks them. CI fails on inline code.
- The only extra origin is the status Worker, in `connect-src`. The site never talks to the home server.
- CodeQL, a ZAP baseline scan, a GPS-metadata check on photos, and the site checks run on pull requests and pushes to `main`.
- GitHub Actions are pinned to commit SHAs, and Dependabot proposes updates for Actions and npm.
- `.well-known/security.txt` has an `Expires` date. Update it at least once a year.

See [SECURITY.md](SECURITY.md) to report a problem.
