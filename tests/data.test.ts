import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { daysUntil, listingsSchema, reportSchema, searchStories, youtubeVideoId } from '../src/data.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = listingsSchema.parse(JSON.parse(readFileSync(resolve(root, 'data/listings.json'), 'utf8')));

test('all listing references resolve to unique, matching report files and local images', () => {
  const slugs = new Set(data.stories.map(story => story.slug));
  assert.equal(slugs.size, data.stories.length);
  assert.equal(readdirSync(resolve(root, 'data/reports')).filter(file => file.endsWith('.json')).length, slugs.size);
  for (const story of data.stories) {
    const report = reportSchema.parse(JSON.parse(readFileSync(resolve(root, `data/reports/${story.slug}.json`), 'utf8')));
    assert.equal(report.slug, story.slug);
    assert.equal(report.title, story.title);
    assert.equal(report.kind, story.kind);
    assert.equal(report.category, story.category);
    assert.equal(report.verdict, story.verdict);
    assert.equal(report.published, story.date);
    assert.ok(report.updated >= report.published);
    if (report.image.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${report.image.src}`)));
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
    assert.ok(slugs.has(group.slug));
    for (const card of group.cards) if (card.image.src.startsWith('/')) assert.ok(existsSync(resolve(root, `public${card.image.src}`)), `Missing gallery asset: ${card.image.src}`);
  }
  for (const category of data.sections.reports.categories) assert.ok(data.stories.some(story => story.kind === 'report' && story.category === category));
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
  assert.ok(searchStories(data.stories, '音檔').some(story => story.slug === 'ai-voice'));
  assert.deepEqual(searchStories(data.stories, 'ＡＩ'), searchStories(data.stories, 'ai'));
  assert.ok(searchStories(data.stories, '圖表 百分比').some(story => story.slug === 'referendum-chart'));
  assert.ok(searchStories(data.stories, '', '公投議題').every(story => story.category === '公投議題'));
  assert.equal(searchStories(data.stories, 'absolutely-no-match').length, 0);
});
