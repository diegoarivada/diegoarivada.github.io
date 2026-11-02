# Diego A. Rivada — Personal Website

A clean, responsive personal portfolio built with HTML and CSS. Currently pursuing a Master's degree at the University of Southern California (USC).

---

## Overview

Source code for my personal website — a single-page portfolio with additional dedicated pages. The site covers:

- **Home (index.html)** — About me, resume, education, interests, skills, and contact form.
- **Coding** — Showcase of programming and engineering projects.
- **Homelab** — Home lab experiments, network diagrams, and a detailed case study.
- **Security** — Standards, the EarDeck threat model, and a live test of this site's own defenses.
- **Pictures** — Personal photography gallery.
- **YouTube** — Embedded content from my channel.

---

## Technologies Used

- **HTML** — Content and layout.
- **CSS** — Styling and responsive design.
- **JavaScript** — Interactive effects, kept in external files so the Content Security Policy never needs `unsafe-inline`.

---

## Project Structure

```
├── index.html                 # Main portfolio page (about, resume, skills, contact)
├── coding.html                # Programming projects
├── homelab.html               # Home lab experiments
├── homelab-case-study.html    # Detailed homelab case study
├── security.html              # Security work, threat model, live CSP test
├── pictures.html              # Photography gallery
├── youtube.html               # YouTube embeds
├── thankyou.html              # Post-contact thank you page
├── styles.css                 # Central stylesheet
├── site.js                    # Shared page behavior and effects
├── security.js                # Threat model explorer and live CSP test
├── .well-known/security.txt   # Vulnerability reporting contact (RFC 9116)
├── .nojekyll                  # Lets GitHub Pages serve .well-known
├── fonts/                     # Self-hosted Rubik (SIL Open Font License)
├── CNAME                      # Custom domain for GitHub Pages
├── favicon.ico                # Site favicon
├── resume.pdf                 # Resume document
├── profile.JPG                # Profile picture
├── images/                    # Image assets (photos, SVG diagrams)
├── scripts/                   # Utility scripts
│   └── convert_svg_to_gif.ps1 # SVG to GIF conversion script
└── README.md                  # This file
```

---

## Security Notes

- Every page sets its own Content Security Policy in a meta tag, because GitHub Pages can't send custom headers. Keep scripts and styles in external files, or the policy will block them.
- CodeQL and a ZAP baseline scan run on pull requests, pushes to `main`, and weekly. ZAP only scans a local copy inside the runner, never the live site.
- GitHub Actions are pinned to commit SHAs, and Dependabot proposes updates.
- `.well-known/security.txt` has an `Expires` date. Update it before it passes, at least once a year.

---

## Contact

- GitHub: [@diegoarivada](https://github.com/diegoarivada)
- LinkedIn: [diego-rivada](https://www.linkedin.com/in/diego-rivada/)
