import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ImageAsset } from './editorial-template.ts';

// Content-addressed images are immutable. Re-imports reuse the same bytes.
export async function writeImageAssets(assets: ImageAsset[], directory: string) {
  for (const asset of assets) {
    if (!/^imported\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(asset.path)) throw new Error('圖片輸出路徑格式錯誤');
    const target = join(directory, asset.path);
    const existing = await readFile(target).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; return null; });
    if (existing && !existing.equals(asset.bytes)) throw new Error(`圖片路徑已存在但內容不同：${target}`);
  }
  for (const asset of assets) {
    const target = join(directory, asset.path);
    await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, asset.bytes, { flag: 'wx' }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !(await readFile(target)).equals(asset.bytes)) throw error;
    }
  }
}
