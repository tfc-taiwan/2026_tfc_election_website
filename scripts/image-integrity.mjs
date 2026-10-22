import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const raster = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
export async function verifyImage(bytes, path) {
  const expected = basename(path).match(/^([a-f0-9]{64})\./)?.[1];
  if (expected) assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `Image content hash mismatch: ${path}`);
  if (raster.has(extname(path).toLowerCase())) {
    // Reading dimensions alone succeeds for some incomplete PNGs. Decode every pixel.
    await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
  }
}

export async function verifyImageDirectory(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await verifyImageDirectory(path);
    else if (raster.has(extname(path).toLowerCase())) {
      await verifyImage(await readFile(path), path);
      count++;
    }
  }
  return count;
}
