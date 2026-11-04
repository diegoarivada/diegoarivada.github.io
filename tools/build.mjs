// Stamps shared partials into every page and writes each page's Content Security Policy
// from site.config.json, so the header, footer, and policy have one source of truth.
//
// In a page, a block like this gets replaced with partials/header.html:
//   <!-- build:header --> ...anything... <!-- /build:header -->
//
// Usage:
//   npm run build           rewrite pages in place, then write sitemap.xml
//   npm run check           exit 1 if any page is out of date (used in CI)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const cfg = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));

if (cfg.statusUrl && !/^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i.test(cfg.statusUrl)) {
  throw new Error(`statusUrl must be a plain https URL, got: ${cfg.statusUrl}`);
}
const statusOrigin = cfg.statusUrl ? new URL(cfg.statusUrl).origin : '';

const partialCache = new Map();
async function partial(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Bad partial name: ${name}`);
  if (!partialCache.has(name)) {
    partialCache.set(name, (await readFile(path.join(root, 'partials', `${name}.html`), 'utf8')).trimEnd());
  }
  return partialCache.get(name);
}

async function render(name, page, depth = 0) {
  if (depth > 3) throw new Error('Partials nest too deep');
  let html = await partial(name);
  html = html.replaceAll('{{statusUrl}}', cfg.statusUrl || '');
  for (const m of [...html.matchAll(/\{\{include:([a-z0-9-]+)\}\}/g)]) {
    html = html.replace(m[0], await render(m[1], page, depth + 1));
  }
  if (name === 'header') {
    const current = cfg.navAlias?.[page] || page;
    // Only the plain nav links are written as <a href="...">, so this marks exactly one of them.
    html = html.replace(`<a href="${current}">`, `<a href="${current}" aria-current="page">`);
  }
  return html;
}

function csp(page) {
  const merged = structuredClone(cfg.csp.base);
  // A page's sources add to the base, except that they replace a base of 'none' (mixing the two is invalid).
  for (const [k, v] of Object.entries(cfg.csp.pages[page] || {})) {
    const base = (merged[k] || []).filter(s => s !== "'none'");
    merged[k] = [...base, ...v];
  }
  if (statusOrigin) merged['connect-src'] = [...merged['connect-src'], statusOrigin];
  return Object.entries(merged)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`)
    .join('; ');
}

let stale = [];
for (const page of cfg.pages) {
  const file = path.join(root, page);
  const before = await readFile(file, 'utf8');
  let html = before.replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?>/,
    `<meta http-equiv="Content-Security-Policy" content="${csp(page)}" />`
  );
  const blocks = [...html.matchAll(/<!-- build:([a-z0-9-]+) -->[\s\S]*?<!-- \/build:\1 -->/g)];
  for (const b of blocks) {
    html = html.replace(b[0], `<!-- build:${b[1]} -->\n${await render(b[1], page)}\n<!-- /build:${b[1]} -->`);
  }
  if (html !== before) {
    stale.push(page);
    if (!checkOnly) await writeFile(file, html);
  }
}

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  cfg.pages.filter(p => !cfg.noSitemap.includes(p))
    .map(p => `  <url><loc>${cfg.origin}/${p === 'index.html' ? '' : p}</loc></url>`).join('\n') +
  '\n</urlset>\n';
const sitemapFile = path.join(root, 'sitemap.xml');
const oldSitemap = await readFile(sitemapFile, 'utf8').catch(() => '');
if (oldSitemap !== sitemap) {
  stale.push('sitemap.xml');
  if (!checkOnly) await writeFile(sitemapFile, sitemap);
}

if (checkOnly && stale.length) {
  console.error(`Out of date, run "npm run build": ${stale.join(', ')}`);
  process.exit(1);
}
console.log(stale.length ? `${checkOnly ? 'Stale' : 'Updated'}: ${stale.join(', ')}` : `All ${cfg.pages.length} pages up to date (${today}).`);
