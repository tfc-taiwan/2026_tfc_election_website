import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { listingsSchema } from '../src/data.ts';
import { convertWorkbook, toWorkbookRows, SHEETS } from './sheets-core.ts';

const input = resolve(process.argv[2] || 'data');
const output = resolve(process.argv[3] || 'generated/spreadsheet-rows.json');
const listings = listingsSchema.parse(JSON.parse(await readFile(`${input}/listings.json`, 'utf8')));
const rows = toWorkbookRows(listings);
convertWorkbook(rows);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(rows, null, 2) + '\n');
await writeFile(output.replace(/\.json$/, '.columns.json'), JSON.stringify(SHEETS, null, 2) + '\n');
console.log(`已匯出 ${Object.keys(rows).length} 張資料工作表至 ${output}`);
