import { fileURLToPath } from 'node:url';
// Renders assets/img/logo.svg into favicon.ico (16/32/48) and apple-touch-icon.png (180).
// Run: node tools/make-logo.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../assets/img/logo.svg', import.meta.url));
const png = (s) => sharp(svg, { density: 72 * s / 64 * 4 }).resize(s, s).png().toBuffer();
const sizes = [16, 32, 48];
const imgs = await Promise.all(sizes.map(png));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(off, e + 12); off += imgs[i].length;
});
await writeFile(new URL('../favicon.ico', import.meta.url), Buffer.concat([head, ...imgs]));
// Apple touch icons get their own rounded mask, so render the tile full-bleed square.
const square = svg.toString().replace('rx="18"', 'rx="0"');
await sharp(Buffer.from(square), { density: 72 * 180 / 64 * 2 }).resize(180, 180).png().toFile(fileURLToPath(new URL('../apple-touch-icon.png', import.meta.url)));
await sharp(svg, { density: 72 * 512 / 64 }).resize(512, 512).png().toFile(fileURLToPath(new URL('../assets/img/logo-512.png', import.meta.url)));
console.log('favicon.ico, apple-touch-icon.png, assets/img/logo-512.png written');
