#!/usr/bin/env tsx
// Optimize raster images under public/images/** to WebP + AVIF siblings.
// Skips files that already have matching .webp / .avif outputs newer than
// the source.
//
// Run: npm run images:optimize

import fs from 'node:fs';
import path from 'node:path';

let sharp: any;
try {
  sharp = require('sharp');
} catch {
  console.error('[images] Error: sharp module not found. Install it with: npm install sharp');
  process.exit(1);
}

const ROOT = path.join(process.cwd(), 'public', 'images');
const EXT = new Set(['.jpg', '.jpeg', '.png']);

if (!fs.existsSync(ROOT)) {
  console.log(`[images] No directory at ${ROOT} — nothing to do.`);
  process.exit(0);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isStale(src: string, dest: string): boolean {
  if (!fs.existsSync(dest)) return true;
  return fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
}

const files = walk(ROOT).filter((f) => EXT.has(path.extname(f).toLowerCase()));
let converted = 0;

for (const src of files) {
  const base = src.replace(/\.(jpe?g|png)$/i, '');
  const webp = `${base}.webp`;
  const avif = `${base}.avif`;

  if (isStale(src, webp)) {
    await sharp(src).webp({ quality: 82 }).toFile(webp);
    converted++;
  }
  if (isStale(src, avif)) {
    await sharp(src).avif({ quality: 60 }).toFile(avif);
    converted++;
  }
}

console.log(
  `[images] Processed ${files.length} source file(s); wrote ${converted} optimized output(s).`,
);
