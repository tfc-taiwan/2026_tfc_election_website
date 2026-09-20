import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { listingsSchema, type Report } from '../src/data.ts';
import { convertReport, reportToParagraphs, toWorkbookRows } from '../scripts/sheets-core.ts';
import { paragraphsFromMarkdown, reportSlug } from '../scripts/report-markdown.ts';
import { readMarkdownReports } from '../scripts/convert-reports.ts';

const listings = listingsSchema.parse(JSON.parse(await readFile(new URL('../data/listings.json', import.meta.url), 'utf8')));
const fixture = await readFile(new URL('./fixtures/google-docs-ai-voice.md', import.meta.url), 'utf8');
const reports: Report[] = await Promise.all(listings.stories.map(async story => JSON.parse(await readFile(new URL(`../data/reports/${story.slug}.json`, import.meta.url), 'utf8'))));
const markdown = (report: Report) => reportToParagraphs(report).map(p => `${p.heading === 'TITLE' || p.heading === 'HEADING_1' ? '# ' : p.heading === 'HEADING_2' ? '## ' : ''}${p.text.replaceAll('[', '\\[').replaceAll(']', '\\]')}`).join('\n\n');
const cli = (...args: string[]) => spawnSync(process.execPath, ['scripts/convert-spreadsheet.ts', ...args], { encoding: 'utf8' });

test('real Google Docs Markdown preserves report content, bullets, escaped headings, dates and SEO', () => {
  const paragraphs = paragraphsFromMarkdown(fixture);
  assert.equal(reportSlug(paragraphs), 'ai-voice');
  assert.deepEqual(convertReport(paragraphs, listings, 'ai-voice'), reports[0]);
  for (const report of reports) assert.deepEqual(convertReport(paragraphsFromMarkdown(markdown(report)), listings, report.slug), report);
  for (const date of ['September 1, 2026', 'Sep 1, 2026', '2026年9月1日', '2026-09-01']) {
    assert.deepEqual(convertReport(paragraphsFromMarkdown(fixture.replaceAll('9月 1, 2026', date)), listings, 'ai-voice'), reports[0]);
  }
  assert.throws(() => paragraphsFromMarkdown(fixture.replaceAll('9月 1, 2026', '01/09/2026')), /YYYY-MM-DD/);
  assert.throws(() => convertReport(paragraphsFromMarkdown(fixture.replaceAll('9月 1, 2026', '2月 30, 2026')), listings, 'ai-voice'), /Invalid ISO date/);
});

test('unsupported Markdown fails explicitly instead of losing content', () => {
  for (const extra of ['![image](https://example.org/a.png)', '| a | b |\n|---|---|\n| 1 | 2 |', '<script>alert(1)</script>', '> quote', '```js\ncode\n```', '[label](https://example.org/)', '~~deleted~~', 'text[^1]\n\n[^1]: footnote']) {
    assert.throws(() => paragraphsFromMarkdown(`${fixture}\n\n${extra}`), /不支援/);
  }
  assert.throws(() => paragraphsFromMarkdown(fixture.replace('* 示範社群', '* [ ] 示範社群')), /勾選框/);
  assert.throws(() => reportSlug(paragraphsFromMarkdown(fixture.replace('slug: ai-voice', 'slug: ../../escape'))), /slug/);
  const sourceLink = fixture.replace('文中場景、文件與判讀結果均為虛構；沒有對應的真實原始證據或採訪紀錄。', '文中場景、文件與判讀結果均為虛構；沒有對應的真實原始證據或採訪紀錄。\n\n@url: <https://example.org/source>');
  assert.equal(convertReport(paragraphsFromMarkdown(sourceLink), listings, 'ai-voice').sources[0].href, 'https://example.org/source');
});

test('document identity comes from content and rejects missing, extra, duplicate or mismatched reports', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-md-'));
  try {
    await writeFile(join(dir, '文章名稱.md'), fixture);
    assert.equal((await readMarkdownReports(dir, listings))[0].slug, 'ai-voice');
    await assert.rejects(readMarkdownReports(dir, listings, true), /缺少文章/);
    await writeFile(join(dir, '重複下載.md'), fixture);
    await assert.rejects(readMarkdownReports(dir, listings), /slug 重複/);
    await rm(join(dir, '重複下載.md'));
    await writeFile(join(dir, '文章名稱.md'), fixture.replace('slug: ai-voice', 'slug: unknown-article'));
    await assert.rejects(readMarkdownReports(dir, listings), /列表缺少/);
    await writeFile(join(dir, '文章名稱.md'), fixture.replace('kind: report', 'kind: guide'));
    await assert.rejects(readMarkdownReports(dir, listings), /kind.*不一致/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('complete import validates before writes, check is read-only, and replacement retains a backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-import-'));
  try {
    const source = join(dir, 'rows.json'), docs = join(dir, 'docs'), target = join(dir, 'data');
    await mkdir(docs); await mkdir(join(target, 'reports'), { recursive: true });
    await writeFile(source, JSON.stringify(toWorkbookRows(listings)));
    await writeFile(join(target, 'listings.json'), 'original');
    await writeFile(join(target, 'reports', 'old.json'), 'old');
    await writeFile(join(docs, 'first.md'), fixture);
    const invalid = cli(source, '--reports', docs, '--out-dir', target, '--replace');
    assert.equal(invalid.status, 1); assert.match(invalid.stderr, /缺少文章/);
    assert.equal(await readFile(join(target, 'listings.json'), 'utf8'), 'original');
    await rm(join(docs, 'first.md'));
    for (const report of reports) await writeFile(join(docs, `${report.slug}.md`), markdown(report));
    const checked = cli(source, '--reports', docs, '--out-dir', target, '--check');
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(await readFile(join(target, 'listings.json'), 'utf8'), 'original');
    const refused = cli(source, '--reports', docs, '--out-dir', target);
    assert.equal(refused.status, 1); assert.match(refused.stderr, /--replace/);
    const valid = cli(source, '--reports', docs, '--out-dir', target, '--replace');
    assert.equal(valid.status, 0, valid.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(target, 'listings.json'), 'utf8')), listings);
    assert.equal((await readdir(join(target, 'reports'))).length, 13);
    for (const report of reports) assert.deepEqual(JSON.parse(await readFile(join(target, 'reports', `${report.slug}.json`), 'utf8')), report);
    const backup = (await readdir(dir)).find(name => name.startsWith('data-backup-'))!;
    assert.equal(await readFile(join(dir, backup, 'listings.json'), 'utf8'), 'original');
    assert.equal(await readFile(join(dir, backup, 'reports', 'old.json'), 'utf8'), 'old');
    assert.equal((await readdir(dir)).some(name => name.includes('-stage-')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('single report CLI changes only its validated output and supports check', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-single-'));
  try {
    const input = join(dir, '文章.md'), output = join(dir, 'reports');
    await writeFile(input, fixture);
    const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/convert-reports.ts', input, '--out', output, ...args], { encoding: 'utf8' });
    assert.equal(run('--check').status, 0);
    assert.deepEqual(await readdir(dir), ['文章.md']);
    const result = run(); assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(output, 'ai-voice.json'), 'utf8')), reports[0]);
    await writeFile(input, fixture.replace('slug: ai-voice', 'slug: ballot-paper'));
    const invalid = run(); assert.equal(invalid.status, 1);
    assert.deepEqual(await readdir(output), ['ai-voice.json']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
