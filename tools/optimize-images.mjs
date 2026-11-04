// Turns the original photos into small AVIF, WebP, and JPEG files at a few widths.
// Metadata (EXIF, GPS) is dropped because sharp only keeps it when asked.
// Usage: npm run images
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'img');

const photos = [
  ['images/photo1.JPG', 'photo1'],
  ['images/photo2.JPG', 'photo2'],
  ['images/photo3.jpeg', 'photo3'],
  ['images/photo4.JPG', 'photo4'],
  ['images/photo5.JPG', 'photo5'],
  ['images/photo6.jpeg', 'photo6'],
];
const PHOTO_WIDTHS = [640, 1280, 1920];

async function variants(input, name, widths, { square = false, dir = out } = {}) {
  await mkdir(dir, { recursive: true });
  const made = {};
  for (const w of widths) {
    let base = sharp(input).rotate();
    base = square
      ? base.resize(w, w, { fit: 'cover', position: 'attention' })
      : base.resize({ width: w, withoutEnlargement: true });
    const buf = await base.toBuffer({ resolveWithObject: true });
    const { width, height } = buf.info;
    const img = () => sharp(buf.data);
    if (w < 1920) await img().avif({ quality: 50, effort: 6 }).toFile(path.join(dir, `${name}-${w}.avif`));
    await img().webp({ quality: 74 }).toFile(path.join(dir, `${name}-${w}.webp`));
    // 1920 is only for the lightbox, which loads WebP, so skip the bigger AVIF and JPEG there.
    if (w < 1920) await img().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(dir, `${name}-${w}.jpg`));
    made[w] = { width, height };
  }
  return made;
}

const manifest = { photos: {}, profile: {} };
for (const [src, name] of photos) {
  manifest.photos[name] = await variants(path.join(root, src), name, PHOTO_WIDTHS, { dir: path.join(out, 'photos') });
}
manifest.profile = await variants(path.join(root, 'profile.JPG'), 'profile', [320, 640], { square: true });

// EarDeck screenshot: keep it as a sharp PNG plus a WebP.
await sharp(path.join(root, 'images/eardeck.png')).webp({ quality: 85 }).toFile(path.join(out, 'eardeck.webp'));


await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const before = (await Promise.all([...photos.map(p => p[0]), 'profile.JPG'].map(f => stat(path.join(root, f))))).reduce((a, s) => a + s.size, 0);
console.log(`Done. Originals: ${(before / 1e6).toFixed(1)} MB. See assets/img/manifest.json for sizes.`);
