import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import readExcelFile from 'read-excel-file/node';
import { convertWorkbook, listingsJson, type WorkbookRows, type Cell } from './sheets-core.ts';
import { readReportBundle } from './convert-reports.ts';
import { writeDataDirectory, writeJsonFile } from './write-data-directory.ts';

export async function readWorkbook(path: string): Promise<WorkbookRows> {
  if (path.toLowerCase().endsWith('.json')) return JSON.parse(await readFile(path, 'utf8'));
  if (!path.toLowerCase().endsWith('.xlsx')) throw new Error('請使用 Google Sheets 下載的 .xlsx，或工作表列資料 .json');
  const sheets = await readExcelFile(path);
  return Object.fromEntries(sheets.map(sheet => [sheet.sheet, sheet.data.map((row, rowIndex) => row.map((value, columnIndex): Cell => {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value) || value instanceof Date) return value as Cell;
    throw new Error(`${sheet.sheet} 第 ${rowIndex + 1} 列、第 ${columnIndex + 1} 欄含不支援的儲存格類型`);
  }))]));
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    console.log('用法：npm run data:import -- <試算表.xlsx> [--out <listings.json>] [--check]\n完整匯入：npm run data:import -- <試算表.xlsx> --reports <Markdown目錄> [--metadata <設定.json>] [--out-dir <data目錄>] [--assets-dir <圖片目錄>] [--replace] [--check]\n預設輸出 generated/listings.json；完整匯入輸出 generated/data，內嵌圖片輸出 generated/images/imported。--check 只驗證。--replace 保留舊目錄備份後替換。'); return;
  }
  const input = args.shift()!;
  let output: string | undefined, reportsPath: string | undefined, outDir: string | undefined, check = false, replace = false;
  let metadataPath: string | undefined, assetsDir: string | undefined;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--check') check = true;
    else if (arg === '--replace') replace = true;
    else if (['--out', '--reports', '--out-dir', '--metadata', '--assets-dir'].includes(arg!) && args[0] && !args[0].startsWith('--')) {
      const value = args.shift()!;
      if (arg === '--out') output = value;
      else if (arg === '--reports') reportsPath = value;
      else if (arg === '--metadata') metadataPath = value;
      else if (arg === '--assets-dir') assetsDir = value;
      else outDir = value;
    } else throw new Error(`未知或不完整參數：${arg}`);
  }
  if (reportsPath && output || !reportsPath && (outDir || replace || metadataPath || assetsDir)) throw new Error('--out 僅用於列表；--out-dir、--replace、--metadata 與 --assets-dir 必須搭配 --reports');
  const result = convertWorkbook(await readWorkbook(input));
  if (reportsPath) {
    const { reports, assets } = await readReportBundle(reportsPath, result, true, metadataPath);
    const directory = outDir ?? 'generated/data';
    const backup = check ? undefined : await writeDataDirectory(result, reports, directory, replace, { assets, directory: assetsDir ?? 'generated/images' });
    console.log(`${check ? '驗證通過' : `已輸出至 ${resolve(directory)}`}：listings.json + ${reports.length} 篇文章 JSON。`);
    if (backup) console.log(`舊資料備份：${backup}`);
    if (assets.length) console.log(`${check ? '已驗證' : `圖片已輸出至 ${resolve(assetsDir ?? 'generated/images')}`}：${assets.length} 張不重複內嵌圖片；網站使用時請放入 public/images/imported/。`);
  } else {
    const target = output ?? 'generated/listings.json';
    if (!check) await writeJsonFile(listingsJson(result), target);
    console.log(`${check ? '驗證通過' : `已輸出至 ${resolve(target)}`}：1 份 listings.json、${result.stories.length} 筆列表文章。`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(`轉換失敗：${error.message}`); process.exitCode = 1; });
