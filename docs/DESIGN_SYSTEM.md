# Design system

One set of tokens shared by diegoarivada.dev and the UltroBot dashboard.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--blue` | `#0a66c2` | `#6394f8` | Links, primary accents |
| `--red` | `#e63946` | `#f0717f` | Second accent, security |
| `--navy` | `#1d3557` | | Text on light, robot outline |
| `--ok` | `#2a9d8f` | | Online, done |
| `--warn` | `#e9a23b` | | In progress |
| `--bg` | `#f4f6fb` | `#0b1220` | Page |
| `--card` | `#ffffff` | `#131c2e` | Cards |
| `--muted` | `#5c6b80` | `#9fb0c8` | Secondary text |
| `--grad` | blue → red, 120° | | Monogram, kickers, primary buttons |

All text pairs meet WCAG AA (4.5:1 body, 3:1 large).

## Type

Rubik, self-hosted, variable 300–900. Hero 40–64 px bold, section titles 26–34 px, body 16 px at 1.6 line height. Kickers are 12 px uppercase with gradient text.

## Shape and depth

Radius 20 px on cards, 12 px on buttons and inputs, full pill on badges. Two-layer soft shadow. Cards lift 3 px on hover.

## Components

Top bar, status pill, hero, eyebrow, button (primary, ghost, solid, outline), card, icon tile, bento grid, timeline, chip group, feed row, pipeline step, live stat tile.

Icons are inline SVG in the Lucide style (ISC license), stroke 2, 18–22 px. No icon font, no CDN.

## The robot

One inline SVG used three ways: 24 px in the status pill, 170 px in the home tile, and large in the UltroBot hero. The state lives on `<html>` as `awake` or `asleep`, so CSS handles everything.

| State | Eyes | Antenna | Body | Extras |
|---|---|---|---|---|
| Awake | Teal, blink every 4.5 s, glance left and right | Pulsing teal glow | Still | Daylight gradient |
| Asleep | Closed arcs | Dim gray | Breathes every 4 s | Three Zzz float up, stars twinkle, moon |

## Motion

Durations 150–300 ms for UI, 2–16 s loops for ambient motion. `prefers-reduced-motion: reduce` turns all of it off.
