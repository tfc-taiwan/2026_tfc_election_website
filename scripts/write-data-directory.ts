import { mkdir, mkdtemp, writeFile, rename, rm, lstat, readdir } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import type { Listings, Report } from '../src/data.ts';
import { listingsJson } from './sheets-core.ts';
import { writeImageAssets } from './write-image-assets.ts';
import type { ImageAsset } from './editorial-template.ts';

export async function writeJsonFile(text: string, output: string) {
  const target = resolve(output);
  if (!target.endsWith('.json')) throw new Error('輸出路徑必須以 .json 結尾');
  await mkdir(dirname(target), { recursive: true });
  const stage = `${target}.stage-${process.pid}-${Date.now()}`;
  try { await writeFile(stage, text); await rename(stage, target); }
  finally { await rm(stage, { force: true }); }
}

// Stage the entire export first. Keep the previous directory as a recoverable backup.
export async function writeDataDirectory(listings: Listings, reports: Report[], output: string, replace: boolean, images?: { assets: ImageAsset[]; directory: string }) {
  const target = resolve(output);
  const existing = await lstat(target).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; return null; });
  if (existing && !replace) throw new Error(`輸出目錄已存在：${target}；請指定新目錄或加 --replace（舊目錄會保留為備份）`);
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error('輸出路徑必須是一般目錄');
    const entries = await readdir(target);
    if (entries.some(name => !['listings.json', 'reports'].includes(name))) throw new Error('輸出目錄含有其他檔案，為避免改動無關資料，請改用新的輸出目錄');
  }
  await mkdir(dirname(target), { recursive: true });
  const stage = await mkdtemp(join(dirname(target), `.${basename(target)}-stage-`));
  let backup: string | undefined;
  try {
    await mkdir(join(stage, 'reports'));
    await writeFile(join(stage, 'listings.json'), listingsJson(listings));
    for (const report of reports) await writeFile(join(stage, 'reports', `${report.slug}.json`), JSON.stringify(report, null, 2) + '\n');
    if (images) await writeImageAssets(images.assets, images.directory);
    if (existing) {
      backup = await mkdtemp(join(dirname(target), `${basename(target)}-backup-`));
      await rm(backup, { recursive: true });
      await rename(target, backup);
    }
    try { await rename(stage, target); }
    catch (error) { if (backup) await rename(backup, target); throw error; }
    return backup;
  } finally { await rm(stage, { recursive: true, force: true }); }
}
