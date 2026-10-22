import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { verifyImage, verifyImageDirectory } from '../scripts/image-integrity.mjs';

test('image checks decode complete pixel data and reject truncated or modified files', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#4080a0' } }).png().toBuffer();
  await verifyImage(png, 'example.png');
  const hash = createHash('sha256').update(png).digest('hex');
  await verifyImage(png, `${hash}.png`);
  await assert.rejects(() => verifyImage(png.subarray(0, 45), 'example.png'));
  await assert.rejects(() => verifyImage(png.subarray(0, 45), `${hash}.png`), /content hash mismatch/);
});

test('all published source raster images are complete and content-addressed imports match', async () => {
  assert.ok(await verifyImageDirectory('public/images') > 0);
});
