import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { listingsSchema, reportSchema } from '../src/data.ts';
import { buildSeo, normalizeSiteUrl, renderSeoHead, robotsTxt, safeJson, sitemapXml } from '../src/seo.ts';

const data = listingsSchema.parse(JSON.parse(readFileSync('data/listings.json', 'utf8')));
const reports = data.stories.map(story => reportSchema.parse(JSON.parse(readFileSync(`data/reports/${story.slug}.json`, 'utf8'))));
const report = reports[0];
const context = { siteUrl: 'https://election.example.org', previewOrigin: 'http://localhost:4173' };
const get = (seo: ReturnType<typeof buildSeo>, name: string) => seo.tags.find(tag => tag.name === name || tag.property === name)?.content;

test('each article gets its own canonical, description, share image, author, dates and breadcrumbs', async () => {
  for (const article of reports) {
    const seo = buildSeo(data, `/reports/${article.slug}?utm_source=test#background`, article, context);
    assert.equal(seo.canonical, `${context.siteUrl}/reports/${article.slug}`);
    assert.equal(seo.title, article.seo.title);
    assert.equal(get(seo, 'description'), article.seo.description);
    assert.equal(get(seo, 'og:image'), new URL(article.seo.image.src, context.siteUrl).href);
    assert.equal(get(seo, 'twitter:card'), 'summary_large_image');
    assert.equal(get(seo, 'article:published_time'), article.published);
    const graphArticle = seo.graph.find(item => ['NewsArticle', 'Article'].includes(String(item['@type'])));
    assert.equal(graphArticle?.headline, article.title);
    assert.equal(graphArticle?.dateModified, article.updated);
    assert.ok(seo.graph.some(item => item['@type'] === 'BreadcrumbList'));
    if (article.seo.image.src.startsWith('/')) {
      const image = await sharp(readFileSync(resolve('public', `.${article.seo.image.src}`))).metadata();
      assert.equal(`image/${image.format}`, article.seo.image.type);
      assert.equal(image.width, article.seo.image.width);
      assert.equal(image.height, article.seo.image.height);
    }
  }
});

test('mock mode remains noindex even with a public origin, and does not advertise mock URLs', () => {
  assert.equal(buildSeo(data, '/', null, context).robots, 'noindex, nofollow');
  assert.equal(buildSeo(data, '/reports/ai-voice', report, context).robots, 'noindex, nofollow');
  assert.ok(!sitemapXml(data, reports, context).includes('<loc>'));
  assert.ok(!robotsTxt(data, context).includes('Disallow: /'));
  assert.ok(!robotsTxt(data, context).includes('Sitemap:'));
});

test('each infographic card has its own page metadata and share image', async () => {
  const seo = buildSeo(data, '/infographics/ai-tools/2?utm_source=share', null, context);
  assert.equal(seo.canonical, `${context.siteUrl}/infographics/ai-tools/2`);
  assert.match(seo.title, /圖卡 2\/3/);
  assert.match(get(seo, 'description') ?? '', /觀察影像或聲音的來源與脈絡/);
  assert.equal(get(seo, 'og:image'), `${context.siteUrl}/images/og/cards/ai-tools-2.png`);
  assert.equal(get(seo, 'og:url'), seo.canonical);
  assert.equal(get(seo, 'robots'), 'noindex, nofollow');
  assert.ok(seo.graph.some(item => item['@type'] === 'ImageObject'));
  const image = await sharp(readFileSync('public/images/og/cards/ai-tools-2.png')).metadata();
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  const missing = buildSeo(data, '/infographics/ai-tools/99', null, context, 'not-found');
  assert.equal(missing.canonical, undefined);
  assert.equal(missing.graph.length, 0);
});

test('public content is indexable; search, errors, individual mock/noindex content are excluded', () => {
  const live = structuredClone(data); live.isMock = false;
  const articles = structuredClone(reports); articles.forEach(article => article.isMock = false);
  const first = articles[0];
  assert.match(buildSeo(live, `/reports/${first.slug}`, first, context).robots, /^index, follow/);
  for (const query of ['?q=音檔', '?category=地方選舉']) {
    const seo = buildSeo(live, '/reports' + query, null, context);
    assert.equal(seo.robots, 'noindex, follow');
    assert.equal(seo.canonical, context.siteUrl + '/reports');
    assert.equal(seo.graph.length, 0);
  }
  for (const status of ['not-found', 'error', 'loading'] as const) {
    const seo = buildSeo(live, '/reports/missing', null, context, status);
    assert.match(seo.robots, /^noindex/);
    assert.equal(seo.canonical, undefined);
    assert.equal(seo.graph.length, 0);
    assert.equal(get(seo, 'og:type'), 'website');
  }
  articles[1].isMock = true;
  articles[2].seo.noindex = true;
  const xml = sitemapXml(live, articles, context);
  assert.ok(xml.includes(`${context.siteUrl}/reports/${first.slug}`));
  assert.ok(xml.includes(`<lastmod>${first.updated}</lastmod>`));
  assert.ok(!xml.includes(`/reports/${articles[1].slug}`));
  assert.ok(!xml.includes(`/reports/${articles[2].slug}`));
  assert.ok(xml.includes(`${context.siteUrl}/infographics/ai-tools/1`));
  assert.ok(robotsTxt(live, context).includes(`Sitemap: ${context.siteUrl}/sitemap.xml`));
  assert.match(buildSeo(live, '/', null, { ...context, siteUrl: null }).robots, /^noindex/);
});

test('metadata and embedded JSON escape executable markup and preserve text', () => {
  const attack = `測試 \" & </script><script>alert('x')</script> $&`;
  const changed = structuredClone(data); changed.seo.home.title = attack; changed.seo.home.description = attack;
  const markup = renderSeoHead(buildSeo(changed, '/', null, context));
  assert.ok(markup.includes('&lt;/script&gt;'));
  assert.ok(!markup.includes("<script>alert('x')"));
  const serialized = safeJson({ attack });
  assert.ok(!serialized.includes('</script>'));
  assert.equal(JSON.parse(serialized).attack, attack);
  assert.equal(normalizeSiteUrl('https://election.example.org/'), context.siteUrl);
  for (const url of ['javascript:alert(1)', 'https://user:secret@example.org', 'https://example.org/path', 'https://example.org?track=1']) assert.throws(() => normalizeSiteUrl(url));
});
