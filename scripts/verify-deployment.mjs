import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = new URL(process.argv[2]).origin;
const local = JSON.parse(await readFile('data/listings.json', 'utf8'));
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
    const home = await (await request('')).text();
    for (const title of local.hero.title) assert.ok(home.includes(escapeHtml(title)), `Missing home title: ${title}`);
    const remote = await (await request('data/listings.json')).json();
    assert.deepEqual(remote, local, 'Deployed content differs from this revision');
    await request('reports');
    for (const story of local.stories) {
      const html = await (await request(`reports/${story.slug}`)).text();
      assert.ok(html.includes('<h1'), `Missing article HTML: ${story.slug}`);
      const article = await (await request(`data/reports/${story.slug}.json`)).json();
      assert.equal(article.slug, story.slug);
      if (story.image?.src.startsWith('/images/')) await request(story.image.src.slice(1));
    }
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
