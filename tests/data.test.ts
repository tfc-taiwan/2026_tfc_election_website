import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { daysUntil, listingsSchema, reportSchema, searchStories, listingStories, youtubeVideoId } from '../src/data.ts';
import { resolveInfographic } from '../src/infographics.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = listingsSchema.parse(JSON.parse(readFileSync(resolve(root, 'data/listings.json'), 'utf8')));

test('footer social links are unique HTTPS destinations', () => {
  assert.deepEqual(data.site.socialLinks.map(item => item.label), ['Facebook', 'Instagram', 'Threads', 'YouTube', 'TikTok', 'X', 'LINE', 'Podcast', '電子報']);
  assert.equal(new Set(data.site.socialLinks.map(item => item.url)).size, data.site.socialLinks.length);
  for (const item of data.site.socialLinks) assert.match(item.url, /^https:\/\//);
});

test('all listing references resolve to unique, matching report files and local images', () => {
  const slugs = new Set(data.stories.map(story => story.slug));
  assert.equal(slugs.size, data.stories.length);
  assert.equal(readdirSync(resolve(root, 'data/reports')).filter(file => file.endsWith('.json')).length, slugs.size);
  for (const story of data.stories) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${story.slug}.json`), 'utf8')));
    assert.equal(report.slug, story.slug);
    assert.ok(report.title.length > 0);
    assert.equal(report.kind, story.kind);
    assert.equal(report.category, story.category);
    assert.equal(report.verdict, story.verdict);
    assert.equal(report.published, story.date);
    if (report.updated && report.published) assert.ok(report.updated >= report.published);
    if (report.image?.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${report.image.src}`)));
    for (const section of [report.background, ...report.checkSections]) {
      if (section.image?.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${section.image.src}`)));
    }
    const ids = [report.background.id, ...report.checkSections.map(section => section.id)];
    assert.equal(new Set(ids).size, ids.length);
    for (const related of report.relatedSlugs) {
      assert.ok(slugs.has(related), `Missing related story: ${related}`);
      assert.notEqual(related, story.slug);
    }
  }
  for (const slug of [...data.sections.reports.items.map(item => item.slug), ...data.sections.analyses.slugs, ...data.sections.learning.items.map(item => item.slug)]) {
    assert.ok(slugs.has(slug), `Missing home section story: ${slug}`);
  }
  for (const item of data.sections.rumors.items) assert.ok(data.sections.scripts.items.some(script => script.id === item.scriptId));
  for (const group of data.sections.infographics?.items ?? []) {
    for (const card of group.cards) if (card.image.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${card.image.src}`)), `Missing gallery asset: ${card.image.src}`);
  }
  for (const story of data.stories.filter(story => story.kind === 'report')) assert.ok(data.sections.reports.categories.includes(story.category!));
});

test('new referendum report, corrected lunch report, pinned short, activities, and debate card heights are ready', () => {
  const referendumSlug = '1128-referendum-fake-news-nuclear-free-policy';
  assert.equal(data.sections.reports.items[0]?.slug, referendumSlug);
  const referendum = data.stories.find(story => story.slug === referendumSlug)!;
  assert.equal(referendum.title, '網傳「1128有5大公投案」是錯誤資訊，公投僅「廢除非核家園」一案');
  assert.equal(referendum.verdict, '錯誤');
  const referendumReport = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${referendumSlug}.json`), 'utf8')));
  assert.equal(referendumReport.reportId, '4380');
  assert.ok(referendumReport.bodySections?.some(section => section.title === '補充資料'));

  const lunchSlug = 'taipei-free-school-lunch-bidding-failures-and-fresh-milk-redemption-rates-claim';
  const lunch = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${lunchSlug}.json`), 'utf8')));
  assert.equal(lunch.updated, '2026-11-04');
  assert.ok(lunch.summaryPoints[0].includes('「生生喝鮮奶」'));
  assert.ok(lunch.background.paragraphs.some(paragraph => paragraph.includes('正確政策名稱應是「生生喝鮮奶」')));
  assert.ok(lunch.bodySections?.[0].paragraphs.some(paragraph => paragraph.startsWith('〖更新說明 2026/11/04〗')));

  assert.equal(data.sections.shorts?.items[0]?.title, 'AI混淆選民認知？民間發起「自律公約」');
  assert.equal(youtubeVideoId(data.sections.shorts!.items[0].url), 'vwcqSl8G5gQ');
  const timed = data.sections.activities.items.filter(item => ['deepfake-press-conference', 'debate', 'election-rumor-script-talk-2026-11-12', 'election-day', 'post-election-rumor-review-2026-12-04'].includes(item.id));
  assert.deepEqual(timed.map(item => item.dateLabel), ['10/29', '10/31', '11/12', '11/28', '12/4']);
  assert.ok(timed.slice(2).every(item => item.tag === '線上分享會' || item.id === 'election-day'));
  assert.ok(timed.filter(item => item.tag === '線上分享會').every(item => item.cta === '詳情在這' && item.href === 'https://tfc-taiwan.oen.tw/events/3LdBgtonf8yq8wZEgupj7JZVNR8'));

  const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
  assert.match(css, /#debate \.story-card h3[^}]*-webkit-line-clamp:\s*4/);
});

test('YouTube watch, short and youtu.be links resolve to embed ids', () => {
  assert.equal(youtubeVideoId('https://www.youtube.com/watch?v=63hT8oS83Vo'), '63hT8oS83Vo');
  assert.equal(youtubeVideoId('https://www.youtube.com/shorts/63hT8oS83Vo'), '63hT8oS83Vo');
  assert.equal(youtubeVideoId('https://youtu.be/63hT8oS83Vo'), '63hT8oS83Vo');
  assert.equal(youtubeVideoId('https://example.com/watch?v=63hT8oS83Vo'), null);
});

test('countdown uses Taipei calendar days and never becomes negative', () => {
  assert.equal(daysUntil('2026-11-28', new Date('2026-09-17T00:00:00Z')), 72);
  assert.equal(daysUntil('2026-11-28', new Date('2026-11-27T15:59:59Z')), 1);
  assert.equal(daysUntil('2026-11-28', new Date('2026-11-27T16:00:00Z')), 0);
  assert.equal(daysUntil('2026-11-28', new Date('2027-01-01T00:00:00Z')), 0);
});

test('search supports Chinese, normalization, multiple terms, category, and no results', () => {
  assert.ok(searchStories(data.stories, '中配').some(story => story.slug === 'fake-infographic-26-chinese-spouses-running-for-chief'));
  assert.deepEqual(searchStories(data.stories, 'ＡＩ'), searchStories(data.stories, 'ai'));
  assert.ok(searchStories(data.stories, '樹木 水泥').some(story => story.slug === 'tree-brown-root-rot-treatment-no-concrete-needed'));
  assert.ok(searchStories(data.stories, '', '公投議題').every(story => story.category === '公投議題'));
  assert.equal(searchStories(data.stories, 'absolutely-no-match').length, 0);
});

test('provided covers match reports while unfilled dates stay absent', () => {
  assert.equal(data.stories.length, 48);
  assert.equal(data.stories.filter(story => story.date === null).length, 1);
  assert.equal(data.stories.filter(story => story.image?.src.startsWith('/images/covers/')).length, 24);
  assert.equal(data.stories.find(story => story.slug === 'ai-edited-image-of-yangliu-on-time-magazine-cover')?.image?.src, '/images/covers/ai-edited-image-of-yangliu-on-time-magazine-cover.jpg');
  assert.equal(data.stories.find(story => story.slug === 'five-star-flag-fine-2020-proposal-not-passed')?.image?.src, '/images/covers/five-star-flag-fine-2020-proposal-not-passed.jpg');
  assert.equal(data.stories.find(story => story.slug === 'deepfake-pledge')?.image, null);
  assert.deepEqual(data.sections.infographics?.slugs, [
    'ten-ng-voting-behaviors-part-1',
    'ten-ng-voting-behaviors-part-2',
    'avoid-candidate-masks-when-voting',
    'four-types-election-rigging-rumors-debunked-facts',
  ]);
  const upper = data.sections.infographics?.items?.find(item => item.slug === 'ten-ng-voting-behaviors-part-1');
  assert.equal(upper?.cards.length, 7);
  assert.deepEqual(upper?.cards.map(card => card.image.src), Array.from({ length: 7 }, (_, index) => `/images/ten-ng-voting-behaviors-part-1-${index + 1}.jpg`));
  const lower = data.sections.infographics?.items?.find(item => item.slug === 'ten-ng-voting-behaviors-part-2');
  assert.equal(lower?.cards.length, 7);
  assert.deepEqual(lower?.cards.map(card => card.image.src), Array.from({ length: 7 }, (_, index) => `/images/ten-ng-voting-behaviors-part-2-${index + 1}.jpg`));
  const masks = data.sections.infographics?.items?.find(item => item.slug === 'avoid-candidate-masks-when-voting');
  assert.equal(masks?.cards.length, 5);
  assert.deepEqual(masks?.cards.map(card => card.image.src), Array.from({ length: 5 }, (_, index) => `/images/avoid-candidate-masks-when-voting-${index + 1}.jpg`));
  const newGallery = data.sections.infographics?.items?.find(item => item.slug === 'four-types-election-rigging-rumors-debunked-facts');
  assert.equal(newGallery?.title, '4種作票謠言樣態');
  assert.equal(newGallery?.cards.length, 7);
  assert.deepEqual(newGallery?.cards.map(card => card.image.src), Array.from({ length: 7 }, (_, index) => `/images/four-types-election-rigging-rumors-debunked-facts-${index + 1}.jpg`));
  const standaloneCard = resolveInfographic(data, '/infographics/four-types-election-rigging-rumors-debunked-facts/1');
  assert.equal(standaloneCard?.story, null);
  assert.equal(standaloneCard?.group.cards.length, 7);
  for (const story of data.stories) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${story.slug}.json`), 'utf8')));
    if (!report.bodySections) assert.deepEqual(report.image, story.image);
    if (story.image?.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${story.image.src}`))); 
    if (story.image) assert.equal(report.seo.image.src, story.image.src);
    const sections = [report.background, ...report.checkSections, ...(report.supplementarySections ?? []), ...(report.bodySections ?? [])];
    for (const section of sections) for (const block of section.blocks ?? []) {
      if (block.type === 'image' && block.image.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${block.image.src}`)));
    }
    for (const privateText of ['Canva', 'slack', '第一行十八個字', '影片存證', 'data:image']) assert.ok(!JSON.stringify(report).includes(privateText));
  }
});

test('deepfake pledge overview has paragraph breaks and a working full article route', () => {
  const initiative = data.sections.initiative!;
  assert.equal(initiative.description.split(/\n\s*\n/).length, 1);
  assert.ok(initiative.content?.principlesNote?.startsWith('本公約並非要求各界停止使用 AI'));
  assert.equal(initiative.content?.fullTextUrl, '/reports/reject-deepfake-election-disinformation-self-regulation-charter');
  assert.ok(data.stories.some(story => story.slug === 'deepfake-pledge'));
  assert.ok(data.stories.some(story => story.slug === 'reject-deepfake-election-disinformation-self-regulation-charter'));
  const article = reportSchema.parse(JSON.parse(readFileSync(resolve(root, 'data/reports/reject-deepfake-election-disinformation-self-regulation-charter.json'), 'utf8')));
  assert.equal(article.seo.noindex, false);
  assert.equal(article.supplementarySections?.length ?? 0, 0);
  assert.deepEqual(article.presentation, { showReportMetadata: false, showSummary: false });
  assert.ok(!article.checkSections.some(section => section.id === 'supporting-organizations'));
  assert.equal(article.checkSections.some(section => section.title.startsWith('常見問答')), false);
});

test('learning guide and community activity use the requested destinations and label', () => {
  assert.equal(data.sections.learning.resources?.find(item => item.title === '選舉訊息繁雜，三大正確資訊管道報你知')?.href, '/reports/reliable-taiwan-election-information-channels-explained');
  assert.equal(data.sections.activities.items.find(item => item.id === 'community')?.tag, '共同維護資訊生態');
  assert.equal(data.sections.activities.items.find(item => item.id === 'debate')?.cta, '點我看更多');
  assert.equal(data.sections.activities.items.find(item => item.id === 'debate')?.href, '/reports?category=%E8%BE%AF%E8%AB%96%E6%9C%83%E6%9F%A5%E6%A0%B8');
});

test('standalone infographic cards resolve without inventing an article', () => {
  const path = '/infographics/four-types-election-rigging-rumors-debunked-facts/1';
  const selected = resolveInfographic(data, path);
  assert.equal(selected?.story, null);
  assert.equal(selected?.group.cards.length, 7);
});

test('category pins keep explanatory articles ahead of new reports without leaking into other lists', () => {
  const pins = data.sections.reports.pinnedSlugs!;
  const sample = structuredClone(data);
  const futureReport = { ...sample.stories.find(story => story.kind === 'report')!, slug: 'new-debate-report', category: '辯論會查核' as const, date: '2026-11-01' };
  sample.stories = [futureReport, ...[...sample.stories].reverse()];
  assert.deepEqual(listingStories(sample, '', '辯論會查核').slice(0, 3).map(story => story.slug), [...pins, futureReport.slug]);
  assert.ok(listingStories(sample).every(story => story.kind === 'report'));
  assert.ok(listingStories(sample, '', '地方選舉').every(story => story.category === '地方選舉' && !pins.includes(story.slug)));
  assert.deepEqual(listingStories(sample, '查核結果說明', '辯論會查核').map(story => story.slug), [pins[1]]);
  assert.equal(listingStories(sample, 'absolutely-no-match', '辯論會查核').length, 0);
  for (const slug of pins) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${slug}.json`), 'utf8')));
    assert.equal(report.kind, 'guide');
    assert.equal(report.verdict, undefined);
    assert.equal(report.presentation?.showReportMetadata, false);
    assert.equal(report.presentation?.showSummary, false);
  }
});

test('homepage debate section can show the pinned explanations before debate fact-check reports', () => {
  const debateStories = listingStories(data, '', '辯論會查核');
  assert.equal(debateStories.length, data.stories.filter(story => story.category === '辯論會查核').length);
  assert.deepEqual(debateStories.slice(0, 2).map(story => story.slug), data.sections.reports.pinnedSlugs);
  assert.ok(debateStories.every(story => story.category === '辯論會查核'));
  assert.ok(debateStories.slice(2).every(story => story.kind === 'report'));
});

test('listing pins reject duplicates and missing articles', () => {
  const invalid = structuredClone(data);
  invalid.sections.reports.pinnedSlugs = ['missing-article'];
  assert.equal(listingsSchema.safeParse(invalid).success, false);
  invalid.sections.reports.pinnedSlugs = Array(2).fill(data.sections.reports.pinnedSlugs![0]);
  assert.equal(listingsSchema.safeParse(invalid).success, false);
});

test('debate report preserves the source verdict and evidence links with the debate result guide', () => {
  const slug = 'mainland-spouses-speech-rights-in-taiwan-claim';
  const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${slug}.json`), 'utf8')));
  assert.equal(report.kind, 'report');
  assert.equal(report.verdict, '與所查資料相符');
  assert.equal(report.finding, '查證結果：與所查資料相符');
  assert.equal(report.verdictGuideSlug, data.sections.reports.pinnedSlugs![1]);
  const evidence = report.bodySections!.flatMap(section => section.blocks ?? []).filter(block => block.type === 'list');
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].items.length, 4);
  assert.ok(evidence[0].items.every(item => item.some(part => part.href?.startsWith('https://'))));
  assert.equal(report.presentation?.showReportMetadata, false);
  assert.equal(report.sources.length, 0);
  assert.deepEqual(report.bodySections!.map(section => section.title), ['說明', '補充資料', '資料來源']);
  assert.equal(report.presentation?.showSummary, false);
});

test('imported debate reports use source featured images for cards and sharing while preserving opening artwork', () => {
  const imported = JSON.parse(readFileSync(resolve(root, 'docs/debate-report-import-2026-10-31.json'), 'utf8')).reports;
  for (const item of imported) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${item.slug}.json`), 'utf8')));
    const story = data.stories.find(story => story.slug === item.slug)!;
    assert.equal(story.image?.src, item.featuredImage.src);
    assert.equal(report.seo.image.src, item.featuredImage.src);
    assert.equal(report.image?.src, item.images[0].src);
    assert.notEqual(story.image?.src, report.image?.src);
  }
});
