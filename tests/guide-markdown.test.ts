import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { convertGuideMarkdown } from '../scripts/editorial-template.ts';
import { listingsSchema } from '../src/data.ts';

test('guide import preserves Q&A, bold text and links without inventing a byline', async () => {
  const listings = listingsSchema.parse(JSON.parse(readFileSync('data/listings.json', 'utf8')));
  const story = listings.stories.find(story => story.slug === 'taiwan-2026-election-voting-notice-ballots-guide')!;
  const metadata = {
    slug: story.slug, reportId: story.slug, updated: null, imageCaption: story.image!.alt,
    seo: JSON.parse(readFileSync('data/reports/taiwan-2026-election-voting-notice-ballots-guide.json', 'utf8')).seo,
  };
  const markdown = `# ${story.title}\n\n指南導言。\n\n### Q1、怎麼查？\n\n* **來源：**[官方網站](https://example.org/source)\n\n### Q2、何時查？\n\n先確認日期。`;
  const { report } = await convertGuideMarkdown(markdown, listings, metadata);
  assert.equal(report.category, '選舉工具箱');
  assert.equal(report.reporter, '未提供');
  assert.equal(report.updated, null);
  assert.deepEqual(report.checkSections.map(section => section.title), ['Q1、怎麼查？', 'Q2、何時查？']);
  assert.ok(JSON.stringify(report.checkSections).includes('https://example.org/source'));
  assert.ok(JSON.stringify(report.checkSections).includes('"bold":true'));
  await assert.rejects(() => convertGuideMarkdown(markdown + '\n\n| 表格 |\n| --- |\n| 不支援 |', listings, metadata), /不支援/);
  await assert.rejects(() => convertGuideMarkdown(markdown.replace(story.title, '錯誤標題'), listings, metadata), /標題與列表不一致/);
  delete story.category;
  const uncategorized = await convertGuideMarkdown(markdown, listings, metadata);
  assert.equal(uncategorized.report.category, undefined);
  assert.equal(uncategorized.report.verdict, undefined);
});
