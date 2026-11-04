# Performance plan

Measured from the repo on Nov 3, 2026.

## Where the weight is

| Asset | Size today | Used on | Plan | Target |
|---|---|---|---|---|
| `images/photo1–6` | 12.7 MB total (photo2 alone is 3.8 MB) | pictures.html | AVIF + WebP at 640, 1280, 1920 wide with `srcset`, JPEG fallback, strip EXIF (photo-privacy workflow already checks GPS) | ~900 KB total for a desktop view |
| `profile.JPG` | 648 KB | every page header, og:image | 320 and 640 wide AVIF/WebP, 1200x630 JPEG for og:image | ~35 KB |
| `resume.pdf` iframe | 232 KB, loads on first visit | index.html | Click to preview (loads the iframe only on request) | 0 KB until asked |
| `styles.css` | 25 KB | all | Split tokens and components, drop unused rules, minify | ~14 KB |
| `site.js` | 13 KB | all | Keep, `defer`, drop effects nobody sees on mobile | ~10 KB |

## Other fixes

- `width` and `height` on every image to stop layout shift.
- `fetchpriority="high"` on the hero portrait, `loading="lazy"` on everything below the fold.
- `<link rel="preload">` for the Rubik font.
- Canonical URLs point at `https://diegoarivada.dev/` (today they say `diegoarivada.github.io`).
- Add `robots.txt` and `sitemap.xml`.
- Real og:image (1200x630) for nicer link previews in Discord and LinkedIn.
- Respect `prefers-reduced-motion` everywhere, including the hero orbs.

## Results (website-v2 branch)

| Asset | Before | After |
|---|---|---|
| Six gallery photos, as loaded on desktop | 12.7 MB | ~0.6 MB (AVIF at 1280 wide, 640 on phones) |
| Hero portrait | 648 KB | 18 KB AVIF (640) / 5 KB (320) |
| Resume PDF on first visit | 232 KB | 0 KB until "Preview resume" |
| Link preview image | broken SVG (bare `&` made it invalid XML) | 49 KB JPEG, 1200x630 |
| EXIF metadata on served photos | present | stripped |

## Targets

Lighthouse mobile: Performance 95+, Accessibility 100, Best Practices 100, SEO 100. Largest Contentful Paint under 1.8 s on a mid-range phone.
