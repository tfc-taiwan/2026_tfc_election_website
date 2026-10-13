import sharp from 'sharp';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const listings = JSON.parse(await readFile(resolve(root, 'data/listings.json'), 'utf8'));
const entries = [{ slug: 'home', image: '/images/network.svg', label: 'THE ELECTION TOOLKIT', mock: listings.isMock }];
for (const story of listings.stories) {
  const report = JSON.parse(await readFile(resolve(root, `data/reports/${story.slug}.json`), 'utf8'));
  // Custom share images remain editor-owned. Only generate the named default fixture assets.
  if (report.seo.image.src === `/images/og/${story.slug}.png`) entries.push({ slug: story.slug, image: report.image?.src ?? '/images/network.svg', label: report.reportId, mock: listings.isMock || report.isMock });
}
await mkdir(resolve(root, 'public/images/og'), { recursive: true });
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
for (const entry of entries) {
  // Local source only: a custom remote image needs an editor-supplied local share image.
  if (!entry.image.startsWith('/images/') || entry.image.includes('..')) throw new Error(`Supply a custom seo.image for ${entry.slug}`);
  const picture = await sharp(await readFile(resolve(root, `public${entry.image}`))).resize(1200, 540, { fit: 'cover' }).png().toBuffer();
  const footer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="90"><rect width="1200" height="90" fill="#f3f2f2"/><text x="48" y="40" font-family="serif" font-size="22" fill="#201e1d">TAIWAN FACTCHECK CENTER / 2026</text><text x="48" y="67" font-family="serif" font-size="15" fill="#006786">${escape(entry.label)}</text><text x="1152" y="50" text-anchor="end" font-family="serif" font-size="18" fill="#aa0b56">${entry.mock ? 'MOCK DATA' : 'FACTCHECK'}</text></svg>`);
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#f3f2f2' } }).composite([{ input: picture, top: 0, left: 0 }, { input: footer, top: 540, left: 0 }]).png().toFile(resolve(root, `public/images/og/${entry.slug}.png`));
}
const cardDir = resolve(root, 'public/images/og/cards');
await rm(cardDir, { recursive: true, force: true });
await mkdir(cardDir, { recursive: true });
let cardCount = 0;
for (const group of listings.sections.infographics?.items ?? []) {
  for (const [index, card] of group.cards.entries()) {
    const source = card.image.src;
    if (!source.startsWith('/images/') || source.includes('..')) throw new Error(`Supply a local image for infographic ${group.slug} card ${index + 1}`);
    const input = await readFile(resolve(root, `public${source}`));
    const background = await sharp(input).resize(1200, 630, { fit: 'cover' }).blur(30).modulate({ brightness: .55 }).png().toBuffer();
    const foreground = await sharp(input).resize(472, 590, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    await sharp(background).composite([{ input: foreground, top: 20, left: 364 }]).png().toFile(resolve(cardDir, `${group.slug}-${index + 1}.png`));
    cardCount++;
  }
}
console.log(`Generated ${entries.length} article and ${cardCount} infographic share images (1200 × 630 PNG).`);
