import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyImage } from './image-integrity.mjs';

const origin = new URL(process.argv[2]).origin;
const profile = process.argv[3];
const local = JSON.parse(await readFile('data/listings.json', 'utf8'));
const imagePaths = new Set();
function collectImages(value) {
  if (Array.isArray(value)) value.forEach(collectImages);
  else if (value && typeof value === 'object') {
    if (typeof value.src === 'string' && value.src.startsWith('/images/')) imagePaths.add(value.src);
    Object.values(value).forEach(collectImages);
  }
}
collectImages(local);
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[character]);
async function request(path, status = 200) {
  const response = await fetch(`${origin}/election2026/${path}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, `${path}: unexpected HTTP status`);
  return response;
}
// A new workers.dev hostname can take a short time to become available.
let lastError;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const homeResponse = await request('');
    const home = await homeResponse.text();
    if (profile === 'preview') {
      assert.equal(homeResponse.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.ok(home.includes('name="robots" content="noindex, nofollow"'));
    } else if (profile === 'production') {
      assert.ok(home.includes('name="robots" content="index, follow, max-image-preview:large"'));
      assert.ok(!home.includes('class="review-notice page-padding"'));
    }
    for (const title of local.hero.title) assert.ok(home.includes(escapeHtml(title)), `Missing home title: ${title}`);
    const remote = await (await request('data/listings.json')).json();
    assert.deepEqual(remote, local, 'Deployed content differs from this revision');
    await request('reports');
    for (const story of local.stories) {
      const html = await (await request(`reports/${story.slug}`)).text();
      assert.ok(html.includes('<h1'), `Missing article HTML: ${story.slug}`);
      if (story.kind === 'report') {
        assert.ok(!html.includes('id="sources"') && !html.includes('href="#sources"'), `Report still shows source section: ${story.slug}`);
        const summary = html.match(/<section class="article-summary"[\s\S]*?<\/section>/)?.[0];
        assert.ok(summary, `Missing report summary: ${story.slug}`);
        for (const paragraph of summary.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
          const text = paragraph[1].replace(/<[^>]*>/g, '');
          assert.equal(text, text.trim(), `Extra blank lines in report summary: ${story.slug}`);
        }
      }
      const article = await (await request(`data/reports/${story.slug}.json`)).json();
      const expectedArticle = JSON.parse(await readFile(`data/reports/${story.slug}.json`, 'utf8'));
      collectImages(expectedArticle);
      assert.deepEqual(article, expectedArticle, `Deployed article differs: ${story.slug}`);
      if (story.image?.src.startsWith('/images/')) await request(story.image.src.slice(1));
    }
    for (const path of imagePaths) {
      const bytes = Buffer.from(await (await request(path.slice(1))).arrayBuffer());
      const expected = await readFile(`public${path}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(expected).digest('hex'), `Deployed image bytes differ: ${path}`);
      await verifyImage(bytes, path);
    }
    console.log(`Verified ${imagePaths.size} deployed images against source bytes and complete raster decoding.`);
    for (const asset of ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'android-chrome-192x192.png', 'apple-touch-icon.png', 'site.webmanifest']) {
      assert.ok(home.includes(`href="/election2026/${asset}?v=`), `Missing versioned favicon reference: ${asset}`);
      const bytes = Buffer.from(await (await request(asset)).arrayBuffer());
      const expected = await readFile(`public/${asset}`);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(expected).digest('hex'), `Deployed favicon differs: ${asset}`);
      await verifyImage(bytes, asset);
    }
    console.log('Verified production favicon files, Apple icon, manifest and versioned HTML references.');
    await request('__deployment-check-not-found__', 404);
    console.log(`Verified home, listing, ${local.stories.length} articles, JSON, images and 404 at ${origin}/election2026/`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`Deployment check ${attempt + 1}/6 failed: ${error.message}`);
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
throw lastError;
