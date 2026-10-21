import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { daysUntil, listingsSchema, reportSchema, searchStories, youtubeVideoId } from '../src/data.ts';
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
  assert.equal(data.stories.length, 12);
  assert.equal(data.stories.filter(story => story.date === null).length, 1);
  assert.equal(data.stories.filter(story => story.image?.src.startsWith('/images/covers/')).length, 7);
  assert.equal(data.stories.find(story => story.slug === 'ai-edited-image-of-yangliu-on-time-magazine-cover')?.image?.src, '/images/covers/ai-edited-image-of-yangliu-on-time-magazine-cover.jpg');
  assert.equal(data.stories.find(story => story.slug === 'five-star-flag-fine-2020-proposal-not-passed')?.image?.src, '/images/covers/five-star-flag-fine-2020-proposal-not-passed.jpg');
  assert.equal(data.stories.find(story => story.slug === 'deepfake-pledge')?.image, null);
  assert.deepEqual(data.sections.infographics?.slugs, [
    'china-xiamen-bridge-does-not-reach-kinmen',
    'taiwan-immigrant-stat-misread-cumulative-data-hoax-explained',
  ]);
  const standaloneCard = resolveInfographic(data, '/infographics/taiwan-immigrant-stat-misread-cumulative-data-hoax-explained/1');
  assert.equal(standaloneCard?.story, null);
  assert.equal(standaloneCard?.group.cards.length, 5);
  for (const story of data.stories) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${story.slug}.json`), 'utf8')));
    assert.deepEqual(report.image, story.image);
    if (story.image) assert.equal(report.seo.image.src, story.image.src);
    const sections = [report.background, ...report.checkSections, ...(report.supplementarySections ?? [])];
    for (const section of sections) for (const block of section.blocks ?? []) {
      if (block.type === 'image' && block.image.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${block.image.src}`)));
    }
    for (const privateText of ['Canva', 'slack', '第一行十八個字', '影片存證', 'data:image']) assert.ok(!JSON.stringify(report).includes(privateText));
  }
});

test('deepfake pledge overview has paragraph breaks and a working full article route', () => {
  const initiative = data.sections.initiative!;
  assert.deepEqual(initiative.description.split(/\n\s*\n/).length, 2);
  assert.equal(initiative.content?.fullTextUrl, '/reports/reject-deepfake-election-disinformation-self-regulation-charter');
  assert.ok(data.stories.some(story => story.slug === 'deepfake-pledge'));
  assert.ok(data.stories.some(story => story.slug === 'reject-deepfake-election-disinformation-self-regulation-charter'));
  const article = reportSchema.parse(JSON.parse(readFileSync(resolve(root, 'data/reports/reject-deepfake-election-disinformation-self-regulation-charter.json'), 'utf8')));
  assert.equal(article.seo.noindex, false);
  assert.equal(article.supplementarySections?.length ?? 0, 0);
  assert.equal(article.checkSections.some(section => section.title.startsWith('常見問答')), false);
});

test('learning guide and community activity use the requested destinations and label', () => {
  assert.equal(data.sections.learning.resources?.find(item => item.title === '選舉訊息繁雜，三大正確資訊管道報你知')?.href, '/reports/reliable-taiwan-election-information-channels-explained');
  assert.equal(data.sections.activities.items.find(item => item.id === 'community')?.tag, '共同維護資訊生態');
});

test('standalone infographic cards resolve without inventing an article', () => {
  const path = '/infographics/taiwan-immigrant-stat-misread-cumulative-data-hoax-explained/1';
  const selected = resolveInfographic(data, path);
  assert.equal(selected?.story, null);
  assert.equal(selected?.group.cards.length, 5);
});
