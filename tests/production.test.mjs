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
const article = JSON.parse(await readFile('data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json', 'utf8'));
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
    const story = source.stories.find(story => `reports/${story.slug}/index.html` === path);
    if (story?.kind === 'report') {
      assert.ok(!html.includes('id="sources"'), path);
      assert.ok(!html.includes('href="#sources"'), path);
      assert.ok(!html.includes('資料來源與說明'), path);
      const summary = html.match(/<section class="article-summary"[\s\S]*?<\/section>/)?.[0];
      assert.ok(summary, path);
      for (const paragraph of summary.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
        const text = paragraph[1].replace(/<[^>]*>/g, '');
        assert.equal(text, text.trim(), `Extra blank lines around summary text: ${path}`);
      }
    }
    if (path === 'index.html') {
      const intro = html.match(/class="pledge-description pledge-description-embedded">([\s\S]*?)<\/div>/)?.[1];
      assert.ok(intro && !intro.includes('本公約並非要求各界停止使用 AI'));
      const note = html.match(/<p class="pledge-principles-note">([\s\S]*?)<\/p>/)?.[1];
      assert.equal(note, source.sections.initiative.content.principlesNote);
      assert.ok(html.indexOf('pledge-principles-note') > html.indexOf('要立即移除、要同等醒目更正'));
      assert.ok(html.includes('href="/reports/reject-deepfake-election-disinformation-self-regulation-charter"'));
      assert.ok(html.includes('閱讀完整內容'));
      assert.ok(!html.includes('上一則案例'));
      assert.ok(!html.includes('暫停案例輪播'));
      assert.ok(!html.includes('專區文章'));
    } else if (path === 'reports/deepfake-pledge/index.html') {
      assert.match(html, /<article class="pledge-page section-padding">/);
      assert.ok(html.includes('自律公約承諾原則：二不二要'));
      assert.match(html, /展開全部案例（(?:<!-- -->)?13/);
      assert.ok(!html.includes('cdn.tailwindcss.com'));
    } else if (path === 'reports/reject-deepfake-election-disinformation-self-regulation-charter/index.html') {
      const articleMarkup = html.slice(html.indexOf('<article class="report-page">'), html.indexOf('</article>'));
      for (const label of ['報告編號：', '查核記者：', '責任編輯：', '重點摘要', '倡議響應組織', '有線電視衛星公會自律委員會', 'Taiwan +']) assert.ok(!articleMarkup.includes(label), label);
      assert.ok(articleMarkup.includes('發佈：'));
      assert.ok(articleMarkup.includes('2026-10-21'));
      assert.ok(html.includes('自律公約內容'));
      assert.ok(!html.includes('常見問答'));
      assert.ok(!html.includes('補充資料'));
      assert.ok(!html.includes('這項倡議在做什麼'));
      assert.ok(!html.includes('對外時程是什麼'));
      assert.ok(html.includes('資料來源與說明'));
      const organizations = JSON.parse(await readFile('data/reports/reject-deepfake-election-disinformation-self-regulation-charter.json', 'utf8')).organizationGroups;
      assert.deepEqual(organizations.map(group => group.organizations.length), [3, 9]);
      const founders = html.indexOf('id="co-initiating-organizations"');
      const supporters = html.indexOf('id="supporting-organizations"');
      assert.ok(founders > 0 && supporters > founders && html.indexOf('id="sources"') > supporters);
      for (const group of organizations) for (const organization of group.organizations) {
        assert.ok(html.includes(organization.name));
        assert.ok(html.includes(`src="${organization.logo.src}"`));
      }
    } else if (path === 'reports/taiwan-2026-election-voting-notice-ballots-guide/index.html') {
      assert.ok(html.includes('guide-body'));
      assert.ok(!html.includes('id="verification"'));
      assert.ok(html.includes('<strong>寄送時間：</strong>'));
    } else if (source.stories.find(story => `reports/${story.slug}/index.html` === path)?.kind === 'guide') { assert.ok(html.includes('guide-body')); } else if (path !== 'index.html' && path !== 'reports/index.html') assert.match(html, /<article class="report-page">[\s\S]+?id="verification"/);
  }
});

test('uncategorized guide renders without an empty breadcrumb or invented section metadata', async () => {
  const guide = JSON.parse(await readFile('data/reports/taiwan-2026-election-voting-notice-ballots-guide.json', 'utf8'));
  delete guide.category;
  const edited = structuredClone(source);
  delete edited.stories.find(story => story.slug === guide.slug).category;
  await writeFile(join(temp, 'data/listings.json'), JSON.stringify(edited));
  await writeFile(join(temp, 'data/reports/taiwan-2026-election-voting-notice-ballots-guide.json'), JSON.stringify(guide));
  try {
    const response = await fetch(base + '/reports/taiwan-2026-election-voting-notice-ballots-guide');
    assert.equal(response.status, 200);
    const html = await response.text();
    const breadcrumbs = html.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0] ?? '';
    assert.match(breadcrumbs, /查核學堂/);
    assert.equal((breadcrumbs.match(/aria-hidden="true"/g) ?? []).length, 1);
    assert.ok(!html.includes('property="article:section"'));
    assert.ok(!html.includes('"articleSection":'));
    assert.ok(!html.includes('class="verdict-legend"'));
  } finally {
    await writeFile(join(temp, 'data/listings.json'), JSON.stringify(source));
    await writeFile(join(temp, 'data/reports/taiwan-2026-election-voting-notice-ballots-guide.json'), await readFile('data/reports/taiwan-2026-election-voting-notice-ballots-guide.json'));
  }
});

test('production SSR uses canonical origin and returns real 404, asset and HEAD responses', async () => {
  const response = await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-robots-tag'), 'index, follow, max-image-preview:large');
  assert.ok(html.includes('href="https://election.example.org/reports/fake-infographic-26-chinese-spouses-running-for-chief"'));
  assert.ok(html.includes('class="report-page"'));
  const head = await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const path of ['/reports/missing', '/missing', '/data/reports/missing.json', '/images/missing.png', '/.server/template.html']) {
    const missing = await fetch(base + path); assert.equal(missing.status, 404); assert.match(missing.headers.get('x-robots-tag'), /noindex/);
  }
  const png = await fetch(base + '/images/og/home.png');
  assert.equal(png.headers.get('content-type'), 'image/png');
  const bytes = Buffer.from(await png.arrayBuffer()); assert.equal(bytes.readUInt32BE(16), 1200);
  const redirect = await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief/', { redirect: 'manual' });
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get('location'), '/reports/fake-infographic-26-chinese-spouses-running-for-chief');
});

test('changing JSON updates initial HTML and runtime JSON without rebuilding JavaScript', async () => {
  const edited = structuredClone(article);
  edited.title = '伺服器即時讀取 JSON 的測試標題';
  edited.seo.title = '更新後的 SEO 標題';
  edited.seo.description = '更新後的 SEO 摘要';
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(edited));
  const html = await (await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief')).text();
  assert.ok(html.includes(`<title data-seo>${edited.seo.title}</title>`));
  assert.ok(html.includes(`<h1>${edited.title}</h1>`));
  assert.ok(html.includes(`name="description" content="${edited.seo.description}"`));
  assert.equal((await (await fetch(base + '/data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json')).json()).title, edited.title);
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(article));
});

test('converted newsroom template renders rich content and supplements in initial HTML', async () => {
  const demo = JSON.parse(await readFile('tests/fixtures/demo-data.json', 'utf8'));
  const { report } = await convertEditorialTemplate(sampleMarkdown, demo.listings, sampleMetadata);
  report.slug = article.slug;
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(report));
  try {
    const response = await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief');
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
  } finally { await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(article)); }
});

test('publishing configuration indexes real content only, including sitemap and search noindex', async () => {
  const live = structuredClone(source); live.isMock = false;
  const real = structuredClone(article); real.isMock = false; real.seo.noindex = false;
  await writeFile(join(temp, 'data/listings.json'), JSON.stringify(live));
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(real));
  const html = await (await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief')).text();
  assert.ok(html.includes('content="index, follow, max-image-preview:large"'));
  const xml = await (await fetch(base + '/sitemap.xml')).text();
  assert.equal((xml.match(/<loc>/g) || []).length, 36);
  assert.ok(xml.includes('/infographics/china-xiamen-bridge-does-not-reach-kinmen/1'));
  assert.ok(xml.includes('https://election.example.org/reports/fake-infographic-26-chinese-spouses-running-for-chief'));
  assert.ok(!xml.includes('/reports/deepfake-pledge</loc>'));
  assert.ok((await (await fetch(base + '/robots.txt')).text()).includes('Sitemap: https://election.example.org/sitemap.xml'));
  const search = await fetch(base + '/reports?q=音檔');
  assert.equal(search.headers.get('x-robots-tag'), 'noindex, follow');
  await writeFile(join(temp, 'data/listings.json'), JSON.stringify(source));
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(article));
});

test('broken editorial JSON returns a non-indexable 503, then recovers after correction', async () => {
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), '{broken');
  const broken = await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief');
  assert.equal(broken.status, 503); assert.match(broken.headers.get('x-robots-tag'), /noindex/);
  await writeFile(join(temp, 'data/reports/fake-infographic-26-chinese-spouses-running-for-chief.json'), JSON.stringify(article));
  assert.equal((await fetch(base + '/reports/fake-infographic-26-chinese-spouses-running-for-chief')).status, 200);
});


test('homepage embeds the initiative with automatic case rotation and one page title', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(html.includes('pledge-embedded'));
  assert.ok(html.includes('真實受害案例'));
  for (const label of ['上一則案例', '下一則案例', '暫停案例輪播']) assert.ok(!html.includes(label));
  assert.ok(html.includes('閱讀完整內容'));
});

test('toolkit has publication-only metadata and consistent return navigation', async () => {
  const html = await readFile('dist/reports/taiwan-2026-election-voting-notice-ballots-guide/index.html', 'utf8');
  const meta = html.match(/<div class="article-meta">([\s\S]*?)<\/div>/)?.[1] || '';
  assert.ok(meta.includes('2026-10-13'));
  for (const label of ['報告編號', '查核記者', '責任編輯', '更新：']) assert.ok(!meta.includes(label));
  assert.ok(html.includes('返回選舉工具箱'));
  assert.ok(!html.includes('**寄送時間：**'));
});

test('old shared article URLs redirect to the new canonical paths', async () => {
  const response = await fetch(base + '/reports/election-prepare?source=shared', { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/reports/taiwan-2026-election-voting-notice-ballots-guide?source=shared');
});
