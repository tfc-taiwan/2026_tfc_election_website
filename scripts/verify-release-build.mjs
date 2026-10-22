import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verifyImageDirectory } from './image-integrity.mjs';

const profile = process.argv[2];
assert.ok(['production', 'preview'].includes(profile), 'Pass a deployment profile');
const preview = profile === 'preview';
const read = path => readFile(`worker-assets/election2026/${path}`, 'utf8');
const imageCount = await verifyImageDirectory('worker-assets/election2026/images');
console.log(`Verified full decoding and content hashes for ${imageCount} staged raster images.`);
const home = await read('index.html');
const data = JSON.parse(await read('data/listings.json'));
const initial = JSON.parse(home.match(/<script id="__TFC_DATA__" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.equal(initial.context.isPreview, preview);
if (!preview) assert.equal(data.isMock, false, 'Approved source content must not be marked as mock');
assert.equal(home.includes('class="review-notice page-padding"'), preview);
assert.ok(home.includes(`name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}"`));
assert.ok(home.includes('href="https://tfc-taiwan.org.tw/election2026/"'));
for (const story of data.stories) {
  const article = JSON.parse(await read(`data/reports/${story.slug}.json`));
  const html = await read(`reports/${story.slug}/index.html`);
  if (preview) assert.ok(html.includes('name="robots" content="noindex, nofollow"'), story.slug);
  else {
    assert.equal(article.isMock, false, story.slug);
    assert.ok(!html.includes('MOCK DATA'), story.slug);
    assert.ok(!html.includes('class="article-mock-note"'), story.slug);
    if (!article.seo.noindex) assert.ok(html.includes('name="robots" content="index, follow, max-image-preview:large"'), story.slug);
  }
}
const sitemap = await read('sitemap.xml');
assert.equal(sitemap.includes('<loc>'), !preview);
const production = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
const staging = JSON.parse(await readFile('wrangler.preview.jsonc', 'utf8'));
assert.notEqual(production.name, staging.name, 'Workers must be separate');
assert.deepEqual(staging.routes, [], 'Preview must not change production routes');
assert.equal(staging.vars.DEPLOYMENT_ENV, 'preview');
assert.equal(production.vars.DEPLOYMENT_ENV, 'production');
console.log(`Verified ${profile} build: separate Worker, correct notices, indexing, canonical URLs and ${data.stories.length} articles.`);
