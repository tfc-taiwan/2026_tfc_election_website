import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { convertEditorialTemplate } from '../scripts/editorial-template.ts';
import { sampleMarkdown, sampleMetadata, sampleTitle } from './fixtures/editorial-sample.ts';

let child, temp, base;
const source = JSON.parse(await readFile('data/listings.json', 'utf8'));
const article = JSON.parse(await readFile('data/reports/26-chinese-spouses.json', 'utf8'));
before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'tfc-seo-test-'));
  await cp('data', join(temp, 'data'), { recursive: true });
  child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATA_DIR: join(temp, 'data'), SITE_URL: 'https://election.example.org' }, stdio: ['ignore', 'pipe', 'pipe'] });
  base = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Production server startup timed out')), 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) { clearTimeout(timer); resolve(url); }
    });
  });
});
after(async () => {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  if (temp) await rm(temp, { recursive: true, force: true });
});

test('built static pages contain body content and unique head metadata', async () => {
  for (const path of ['index.html', 'reports/index.html', ...source.stories.map(story => `reports/${story.slug}/index.html`)]) {
    const html = await readFile(join('dist', path), 'utf8');
    assert.equal((html.match(/<title data-seo>/g) || []).length, 1);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(html.includes('type="application/ld+json"'));
    assert.ok(!html.includes('<!--app-html-->'));
    assert.match(html, /<h1[^>]*>[\s\S]+?<\/h1>/);
    if (path !== 'index.html' && path !== 'reports/index.html') assert.match(html, /<article class="report-page">[\s\S]+?id="verification"/);
  }
});

test('production SSR uses canonical origin and returns real 404, asset and HEAD responses', async () => {
  const response = await fetch(base + '/reports/26-chinese-spouses');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.ok(html.includes('href="https://election.example.org/reports/26-chinese-spouses"'));
  assert.ok(html.includes('class="report-page"'));
  const head = await fetch(base + '/reports/26-chinese-spouses', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const path of ['/reports/missing', '/missing', '/data/reports/missing.json', '/images/missing.png', '/.server/template.html']) {
    const missing = await fetch(base + path); assert.equal(missing.status, 404); assert.match(missing.headers.get('x-robots-tag'), /noindex/);
  }
  const png = await fetch(base + '/images/og/home.png');
  assert.equal(png.headers.get('content-type'), 'image/png');
  const bytes = Buffer.from(await png.arrayBuffer()); assert.equal(bytes.readUInt32BE(16), 1200);
  const redirect = await fetch(base + '/reports/26-chinese-spouses/', { redirect: 'manual' });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), '/reports/26-chinese-spouses');
});

test('changing JSON updates initial HTML and runtime JSON without rebuilding JavaScript', async () => {
  const edited = structuredClone(article);
  edited.title = '伺服器即時讀取 JSON 的測試標題';
  edited.seo.title = '更新後的 SEO 標題';
  edited.seo.description = '更新後的 SEO 摘要';
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(edited));
  const html = await (await fetch(base + '/reports/26-chinese-spouses')).text();
  assert.ok(html.includes(`<title data-seo>${edited.seo.title}</title>`));
  assert.ok(html.includes(`<h1>${edited.title}</h1>`));
  assert.ok(html.includes(`name="description" content="${edited.seo.description}"`));
  assert.equal((await (await fetch(base + '/data/reports/26-chinese-spouses.json')).json()).title, edited.title);
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(article));
});

test('converted newsroom template renders rich content and supplements in initial HTML', async () => {
  const demo = JSON.parse(await readFile('tests/fixtures/demo-data.json', 'utf8'));
  const { report } = await convertEditorialTemplate(sampleMarkdown, demo.listings, sampleMetadata);
  report.slug = article.slug;
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(report));
  try {
    const response = await fetch(base + '/reports/26-chinese-spouses');
    assert.equal(response.status, 200);
    const html = await response.text();
    const markup = html.slice(html.indexOf('<article class="report-page">'), html.indexOf('</article>'));
    assert.ok(markup.includes(`<h1>${sampleTitle}</h1>`));
    assert.ok(markup.includes('<strong>虛構素材</strong>'));
    assert.ok(markup.includes('href="https://example.org/evidence"'));
    assert.ok(markup.includes('<em>圖片原始比例</em>'));
    assert.ok(markup.includes('id="supplementary"'));
    assert.ok(markup.includes('<figcaption>圖一：範本原有的占位圖片，僅供測試。</figcaption>'));
    assert.ok(markup.indexOf(report.background.paragraphs[0]) < markup.indexOf('<figcaption>圖一'));
    assert.ok(markup.indexOf('<figcaption>圖一') < markup.indexOf(report.background.paragraphs[1]));
    assert.equal(markup.includes('Canva'), false);
    assert.equal(markup.includes('若格式跑掉'), false);
  } finally { await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(article)); }
});

test('publishing configuration indexes real content only, including sitemap and search noindex', async () => {
  const live = structuredClone(source); live.isMock = false;
  const real = structuredClone(article); real.isMock = false; real.seo.noindex = false;
  await writeFile(join(temp, 'data/listings.json'), JSON.stringify(live));
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(real));
  const html = await (await fetch(base + '/reports/26-chinese-spouses')).text();
  assert.ok(html.includes('content="index, follow, max-image-preview:large"'));
  const xml = await (await fetch(base + '/sitemap.xml')).text();
  assert.equal((xml.match(/<loc>/g) || []).length, 3);
  assert.ok(xml.includes('https://election.example.org/reports/26-chinese-spouses'));
  assert.ok(!xml.includes('ballot-paper'));
  assert.ok((await (await fetch(base + '/robots.txt')).text()).includes('Sitemap: https://election.example.org/sitemap.xml'));
  const search = await fetch(base + '/reports?q=音檔');
  assert.equal(search.headers.get('x-robots-tag'), 'noindex, follow');
  await writeFile(join(temp, 'data/listings.json'), JSON.stringify(source));
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(article));
});

test('broken editorial JSON returns a non-indexable 503, then recovers after correction', async () => {
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), '{broken');
  const broken = await fetch(base + '/reports/26-chinese-spouses');
  assert.equal(broken.status, 503); assert.match(broken.headers.get('x-robots-tag'), /noindex/);
  await writeFile(join(temp, 'data/reports/26-chinese-spouses.json'), JSON.stringify(article));
  assert.equal((await fetch(base + '/reports/26-chinese-spouses')).status, 200);
});
