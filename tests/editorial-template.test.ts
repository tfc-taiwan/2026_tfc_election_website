import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { listingsSchema, reportSchema } from '../src/data.ts';
import { convertEditorialTemplate, isEditorialTemplate } from '../scripts/editorial-template.ts';
import { readReportBundle } from '../scripts/convert-reports.ts';
import { toWorkbookRows } from '../scripts/sheets-core.ts';
import { editorialTemplate, sampleMarkdown, sampleMetadata, sampleReport, sampleTitle } from './fixtures/editorial-sample.ts';

const listings = listingsSchema.parse(JSON.parse(await readFile(new URL('../data/listings.json', import.meta.url), 'utf8')));

test('actual newsroom template maps headings, byline, ordered rich content and embedded images to valid report JSON', async () => {
  assert.equal(isEditorialTemplate(editorialTemplate), true);
  const { report, assets } = await convertEditorialTemplate(sampleMarkdown, listings, sampleMetadata);
  assert.deepEqual(reportSchema.parse(report), report);
  assert.equal(report.title, sampleTitle);
  assert.notEqual(report.title, listings.stories[0].title);
  assert.equal(report.reporter, sampleReport.reporter);
  assert.equal(report.editor, sampleReport.editor);
  assert.equal(report.isMock, true);
  assert.deepEqual(report.summaryPoints, sampleReport.summaryPoints);
  assert.deepEqual(report.background.paragraphs, sampleReport.background.paragraphs);
  assert.deepEqual(report.background.blocks!.map(b => b.type), ['paragraph', 'image', 'paragraph']);
  assert.equal(report.checkSections.length, 3);
  assert.equal(report.supplementarySections!.length, 1);
  assert.equal(report.supplementarySections![0].title, '範本測試補充說明');
  const inline = report.checkSections[0].blocks![1];
  assert.equal(inline.type, 'paragraph');
  if (inline.type === 'paragraph') {
    assert.ok(inline.content.some(run => run.text === '虛構素材' && run.bold));
    assert.ok(inline.content.some(run => run.text === '來源格式示範' && run.href === 'https://example.org/evidence'));
  }
  assert.equal(assets.length, 1, 'repeat images deduplicate; verdict icons and workflow assets stay private');
  const hash = createHash('sha256').update(assets[0].bytes).digest('hex');
  assert.equal(assets[0].path, `imported/${hash}.png`);
  const figure = report.background.blocks![1];
  assert.equal(figure.type, 'image');
  if (figure.type === 'image') {
    assert.equal(figure.image.src, `/images/${assets[0].path}`);
    assert.equal(figure.image.alt, figure.caption);
    assert.equal(figure.caption, '圖一：範本原有的占位圖片，僅供測試。');
  }
  for (const privateText of ['slack', 'Canva', 'LINE首圖', '第一行十八個字', '查核指標說明', '若格式跑掉', '標題5', 'data:image']) assert.equal(JSON.stringify(report).includes(privateText), false, privateText);
});

test('empty original template, missing metadata and malformed content fail with useful editorial errors', async () => {
  await assert.rejects(convertEditorialTemplate(editorialTemplate, listings, undefined), /--metadata/);
  await assert.rejects(convertEditorialTemplate(editorialTemplate, listings, sampleMetadata), /首頁標題 尚未填寫/);
  const cases: [string, RegExp][] = [
    [sampleMarkdown.replace(`![][image1]**${sampleTitle}**`, '![][image1]'), /「內文標題」正文/],
    [sampleMarkdown.replace('\\#\\#\\#內容迄\\#\\#\\#', ''), /一組順序正確/],
    [sampleMarkdown.replace('（記者：示範查核小組；責任編輯：示範編輯）', '（記者：；責任編輯：）'), /記者：姓名/],
    [sampleMarkdown.replace(sampleReport.title, '不一致的首頁標題'), /首頁標題與文章列表不一致/],
    [sampleMarkdown.replace('https://example.org/evidence', 'javascript:alert'), /HTTPS/],
    [sampleMarkdown.replace('##### *圖一：範本原有的占位圖片，僅供測試。*', '##### *圖片文字要用標題5*'), /圖說提示文字/],
    [sampleMarkdown.replace('![][image2]', '缺少圖片'), /圖說必須緊接/],
    [sampleMarkdown.replace('## **查核**', '## **不認得的區塊**'), /不認得或重複/],
    [sampleMarkdown.replace('## **背景**', '## **背景**\n\n|a|b|\n|---|---|\n|c|d|'), /不支援內容區域的 table/],
  ];
  for (const [markdown, error] of cases) await assert.rejects(convertEditorialTemplate(markdown, listings, sampleMetadata), error);
  await assert.rejects(convertEditorialTemplate(sampleMarkdown, listings, { ...sampleMetadata, seo: undefined }), /seo/);
  await assert.rejects(convertEditorialTemplate(sampleMarkdown, listings, { ...sampleMetadata, updated: '2020-01-01' }), /更新日期/);
});

test('single report CLI checks without writes, extracts images, and rejects invalid input before replacing files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-editorial-'));
  try {
    const source = join(dir, '記者上稿.md'), meta = join(dir, 'metadata.json'), output = join(dir, 'reports'), images = join(dir, 'images');
    await writeFile(source, sampleMarkdown);
    await writeFile(meta, JSON.stringify({ '記者上稿.md': sampleMetadata }));
    const run = (...args: string[]) => spawnSync(process.execPath, ['scripts/convert-reports.ts', source, '--metadata', meta, '--out', output, '--assets-dir', images, ...args], { encoding: 'utf8' });
    const check = run('--check'); assert.equal(check.status, 0, check.stderr);
    assert.deepEqual((await readdir(dir)).sort(), ['metadata.json', '記者上稿.md']);
    const converted = run(); assert.equal(converted.status, 0, converted.stderr);
    const reportText = await readFile(join(output, 'ai-voice.json'), 'utf8');
    assert.equal(JSON.parse(reportText).title, sampleTitle);
    assert.equal((await readdir(join(images, 'imported'))).length, 1);
    const again = run(); assert.equal(again.status, 0, again.stderr);
    await writeFile(source, editorialTemplate);
    const invalid = run(); assert.equal(invalid.status, 1); assert.match(invalid.stderr, /尚未填寫/);
    assert.equal(await readFile(join(output, 'ai-voice.json'), 'utf8'), reportText);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('batch import accepts both document formats and keeps duplicate/completeness checks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-editorial-batch-'));
  try {
    const docs = join(dir, 'docs'), meta = join(dir, 'metadata.json'), rows = join(dir, 'rows.json'), output = join(dir, 'data'), images = join(dir, 'images');
    await mkdir(docs);
    await writeFile(join(docs, '新範本.md'), sampleMarkdown);
    await writeFile(meta, JSON.stringify({ '新範本.md': sampleMetadata }));
    await assert.rejects(readReportBundle(docs, listings, true, meta), /缺少文章/);
    const { reportToParagraphs } = await import('../scripts/sheets-core.ts');
    for (const story of listings.stories.slice(1)) {
      const report = JSON.parse(await readFile(new URL(`../data/reports/${story.slug}.json`, import.meta.url), 'utf8'));
      const markdown = reportToParagraphs(report).map(p => `${p.heading === 'TITLE' || p.heading === 'HEADING_1' ? '# ' : p.heading === 'HEADING_2' ? '## ' : ''}${p.text.replaceAll('[', '\\[').replaceAll(']', '\\]')}`).join('\n\n');
      await writeFile(join(docs, `${story.slug}.md`), markdown);
    }
    await writeFile(rows, JSON.stringify(toWorkbookRows(listings)));
    const result = spawnSync(process.execPath, ['scripts/convert-spreadsheet.ts', rows, '--reports', docs, '--metadata', meta, '--out-dir', output, '--assets-dir', images], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readdir(join(output, 'reports'))).length, listings.stories.length);
    assert.equal((await readdir(join(images, 'imported'))).length, 1);
    const oldMarkdown = await readFile(new URL('./fixtures/google-docs-ai-voice.md', import.meta.url), 'utf8');
    await writeFile(join(docs, 'duplicate.md'), oldMarkdown);
    await assert.rejects(readReportBundle(docs, listings, true, meta), /slug 重複/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
