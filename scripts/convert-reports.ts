import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listingsSchema, type Listings, type Report } from '../src/data.ts';
import { convertReport } from './sheets-core.ts';
import { paragraphsFromMarkdown, reportSlug } from './report-markdown.ts';
import { writeJsonFile } from './write-data-directory.ts';
import { convertEditorialTemplate, isEditorialTemplate, type ImageAsset } from './editorial-template.ts';
import { writeImageAssets } from './write-image-assets.ts';

export async function readReportBundle(input: string, listings: Listings, requireAll = false, metadataPath?: string): Promise<{ reports: Report[]; assets: ImageAsset[] }> {
  const metadata: Record<string, unknown> = metadataPath ? JSON.parse(await readFile(metadataPath, 'utf8')) : {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('--metadata 必須是以 Markdown 檔名為鍵的 JSON 物件');
  const info = await stat(input);
  const names = info.isDirectory() ? (await readdir(input)).filter(name => !name.startsWith('.')).sort().map(name => join(input, name)) : [input];
  if (!names.length) throw new Error('文章資料夾沒有 Markdown 檔案');
  const reports: Report[] = [];
  const assets = new Map<string, ImageAsset>();
  const seen = new Set<string>();
  for (const name of names) {
    if (extname(name).toLowerCase() !== '.md' || !(await stat(name)).isFile()) throw new Error(`${name}：文章資料夾只接受 Google Docs 下載的 .md 檔案`);
    try {
      const markdown = await readFile(name, 'utf8');
      let report: Report;
      if (isEditorialTemplate(markdown)) {
        const converted = await convertEditorialTemplate(markdown, listings, Object.hasOwn(metadata, basename(name)) ? metadata[basename(name)] : undefined);
        report = converted.report;
        for (const asset of converted.assets) assets.set(asset.path, asset);
      } else {
        const paragraphs = paragraphsFromMarkdown(markdown);
        report = convertReport(paragraphs, listings, reportSlug(paragraphs));
      }
      const slug = report.slug;
      if (seen.has(slug)) throw new Error(`slug 重複：${slug}；請移除重複下載的文件`);
      seen.add(slug);
      reports.push(report);
    } catch (error) { throw new Error(`${name}：${(error as Error).message}`); }
  }
  if (requireAll) {
    const missing = listings.stories.filter(story => !seen.has(story.slug)).map(story => story.slug);
    if (missing.length) throw new Error(`缺少文章：${missing.join('、')}`);
  }
  return { reports, assets: [...assets.values()] };
}

export async function readMarkdownReports(input: string, listings: Listings, requireAll = false): Promise<Report[]> {
  return (await readReportBundle(input, listings, requireAll)).reports;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('用法：npm run data:reports -- <文章.md> [--listings <listings.json>] [--metadata <設定.json>] [--out <reports目錄>] [--assets-dir <圖片目錄>] [--check]\n預設讀 data/listings.json，輸出 generated/reports/<slug>.json 與 generated/images/imported/。批次完整匯入請用 data:import --reports。'); return;
  }
  const input = args.shift()!;
  let listingPath = 'data/listings.json', output = 'generated/reports', assetsDir = 'generated/images', metadataPath: string | undefined, check = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--check') check = true;
    else if (['--listings', '--out', '--metadata', '--assets-dir'].includes(arg!) && args[0] && !args[0].startsWith('--')) {
      const value = args.shift()!;
      if (arg === '--listings') listingPath = value;
      else if (arg === '--metadata') metadataPath = value;
      else if (arg === '--assets-dir') assetsDir = value;
      else output = value;
    }
    else throw new Error(`未知或不完整參數：${arg}`);
  }
  if (!(await stat(input)).isFile()) throw new Error('單篇匯入請指定 .md 檔案；完整資料夾請使用 data:import --reports');
  const listings = listingsSchema.parse(JSON.parse(await readFile(listingPath, 'utf8')));
  const { reports, assets } = await readReportBundle(input, listings, false, metadataPath);
  if (!check) await writeImageAssets(assets, assetsDir);
  for (const report of reports) if (!check) await writeJsonFile(JSON.stringify(report, null, 2) + '\n', join(output, `${report.slug}.json`));
  console.log(`${check ? '驗證通過' : `已輸出至 ${resolve(output)}`}：${reports.map(report => `${report.slug}.json`).join('、')}。`);
  if (assets.length) console.log(`${check ? '已驗證' : `圖片已輸出至 ${resolve(assetsDir)}`}：${assets.length} 張不重複內嵌圖片；網站使用時請放入 public/images/imported/。`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(`轉換失敗：${error.message}`); process.exitCode = 1; });
