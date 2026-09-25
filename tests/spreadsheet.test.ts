import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { convertWorkbook, toWorkbookRows, convertReport, reportToParagraphs } from '../scripts/sheets-core.ts';
import { listingsSchema, type Report } from '../src/data.ts';

const listings = listingsSchema.parse(JSON.parse(await readFile(new URL('../data/listings.json', import.meta.url), 'utf8')));
const reports: Report[] = await Promise.all(listings.stories.map(async s => JSON.parse(await readFile(new URL(`../data/reports/${s.slug}.json`, import.meta.url), 'utf8'))));

test('spreadsheet rows round-trip the complete homepage without reading or embedding report text', () => {
  const book = toWorkbookRows(listings);
  assert.deepEqual(convertWorkbook(book), listings);
  assert.equal(Object.keys(book).length, 10);
  assert.equal(book['首頁編排'].filter(row => row[0] === 'shorts').length, 3);
  assert.equal(book['首頁編排'].filter(row => row[0] === 'infographics').length, 3);
  assert.equal(book['首頁編排'][0][4], '圖卡組名');
  assert.equal(book['首頁編排'].find(row => row[0] === 'infographics')?.[4], listings.sections.infographics?.items?.[0].title);
  assert.equal(book['首頁編排'][0][5], '首頁標題');
  assert.equal(book['首頁編排'][0][6], 'YouTube 連結');
  assert.equal(book['首頁編排'].find(row => row[0] === 'reports')?.[5], listings.sections.reports.items[0].title);
  assert.equal(book['首頁編排'].find(row => row[0] === 'shorts')?.[6], listings.sections.shorts?.items[0].url);
  assert.match(String(book['網站設定'].find(row => row[0] === 'site.socialLinks')?.[1]), /^Facebook \| https:\/\//);
  assert.equal(JSON.stringify(book).includes(reports[0].summaryPoints[0]), false);
  const reversed = Object.fromEntries(Object.entries(book).map(([name, rows]) => [name, rows.map(row => row.slice().reverse())]));
  assert.deepEqual(convertWorkbook(reversed), listings);
});

test('sheet edits, blank rows, boolean strings and date serials convert predictably', () => {
  const book = toWorkbookRows(listings);
  book['文章列表'][1][4] = '新的列表標題';
  book['文章列表'][1][6] = (Date.parse(listings.stories[0].date) - Date.UTC(1899, 11, 30)) / 86400000;
  book['文章列表'].push([]);
  book['网站設定'] = []; // Extra user worksheets do not affect conversion.
  book['網站設定'].find(row => row[0] === 'isMock')![1] = 'TRUE';
  const converted = convertWorkbook(book);
  assert.equal(converted.stories[0].title, '新的列表標題');
  assert.equal(converted.stories[0].date, listings.stories[0].date);
  assert.equal(converted.stories.length, 13);
  assert.equal(converted.isMock, true);
});

test('invalid spreadsheet cells and broken references fail before export', () => {
  const cases: [(b: ReturnType<typeof toWorkbookRows>) => void, RegExp][] = [
    [b => { delete b['圖卡內容']; }, /缺少工作表「圖卡內容」/],
    [b => { b['圖卡內容'] = [b['圖卡內容'][0]]; }, /至少需要每組一張圖片/],
    [b => { b['圖卡內容'][2][1] = b['圖卡內容'][1][1]; }, /圖卡 slug 與順序不可重複/],
    [b => { b['圖卡內容'][1][0] = 'missing'; }, /不在首頁 infographics 編排/],
    [b => { b['文章列表'][2][1] = b['文章列表'][1][1]; }, /slug不可重複/],
    [b => { b['文章列表'][1][1] = '../../bad'; }, /找不到文章|Invalid string/],
    [b => { b['首頁編排'][1][2] = 'missing'; }, /找不到文章/],
    [b => { b['首頁編排'].find(r => r[0] === 'shorts')![2] = 'short-video'; }, /不使用 slug/],
    [b => { b['首頁編排'].find(r => r[0] === 'infographics')![4] = ''; }, /須填圖卡組名/],
    [b => { b['首頁編排'].find(r => r[0] === 'shorts')![5] = ''; }, /須填首頁標題/],
    [b => { b['首頁編排'].find(r => r[0] === 'shorts')![6] = ''; }, /須填 YouTube 連結/],
    [b => { b['首頁編排'].find(r => r[0] === 'shorts')![6] = 'https://example.com/video'; }, /YouTube/],
    [b => { b['網站設定'].find(r => r[0] === 'isMock')![1] = 'maybe'; }, /TRUE 或 FALSE/],
    [b => { b['網站設定'].find(r => r[0] === 'site.socialLinks')![1] = 'Facebook https://example.com'; }, /名稱 \| https:\/\/網址/],
    [b => { b['文章列表'][1][6] = '2026-02-30'; }, /Invalid ISO date/],
    [b => { b['文章列表'][0][1] = 'slugg'; }, /缺少或重複/],
    [b => { b['文章列表'][1][2] = 'typo'; }, /僅接受/],
    [b => { b['謠言分類'][1][5] = 'missing'; }, /找不到劇本/],
    [b => { b['首頁編排'][2][1] = 1; }, /順序不可重複/],
  ];
  for (const [mutate, error] of cases) { const book = toWorkbookRows(listings); mutate(book); assert.throws(() => convertWorkbook(book), error); }
});

test('all 13 report templates round-trip and prevent mismatched or silently dropped content', () => {
  for (const report of reports) assert.deepEqual(convertReport(reportToParagraphs(report), listings, report.slug), report);
  const paragraphs = reportToParagraphs(reports[0]);
  assert.throws(() => convertReport(paragraphs, listings, 'ballot-paper'), /slug.*不一致/);
  assert.throws(() => convertReport(paragraphs.filter(p => p.text !== 'SEO'), listings, reports[0].slug));
  assert.throws(() => convertReport([...paragraphs, { text: '不支援區塊', heading: 'HEADING_1' }], listings, reports[0].slug), /不認得/);
});

test('Docs editor links stay out of public listings', () => {
  const links = Object.fromEntries(listings.stories.map(s => [s.slug, `https://docs.google.com/document/d/${s.slug}/edit?tab=t.0`]));
  assert.deepEqual(convertWorkbook(toWorkbookRows(listings, links)), listings);
});

test('CLI exports report title overrides and YouTube shorts, then preserves output on validation failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tfc-converter-'));
  try {
    const source = join(dir, 'rows.json'), target = join(dir, 'data/listings.json');
    await mkdir(join(dir, 'data/reports'), { recursive: true });
    await writeFile(target, 'keep-original'); await writeFile(join(dir, 'data/reports/sentinel.json'), 'untouched');
    const validBook = toWorkbookRows(listings);
    await writeFile(source, JSON.stringify(validBook));
    const valid = spawnSync(process.execPath, ['scripts/convert-spreadsheet.ts', source, '--out', target], { encoding: 'utf8' });
    assert.equal(valid.status, 0, valid.stderr);
    const converted = listingsSchema.parse(JSON.parse(await readFile(target, 'utf8')));
    assert.deepEqual(converted.sections.reports.items, listings.sections.reports.items);
    assert.deepEqual(converted.sections.shorts?.items, listings.sections.shorts?.items);
    const book = toWorkbookRows(listings); book['文章列表'][1][6] = 'not-a-date';
    await writeFile(target, 'keep-original'); await writeFile(source, JSON.stringify(book));
    const invalid = spawnSync(process.execPath, ['scripts/convert-spreadsheet.ts', source, '--out', target], { encoding: 'utf8' });
    assert.equal(invalid.status, 1); assert.match(invalid.stderr, /日期/); assert.equal(await readFile(target, 'utf8'), 'keep-original');
    await writeFile(source, JSON.stringify(toWorkbookRows(listings)));
    const recovered = spawnSync(process.execPath, ['scripts/convert-spreadsheet.ts', source, '--out', target], { encoding: 'utf8' });
    assert.equal(recovered.status, 0, recovered.stderr); assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), listings);
    assert.equal(await readFile(join(dir, 'data/reports/sentinel.json'), 'utf8'), 'untouched');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
