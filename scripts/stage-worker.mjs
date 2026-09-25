import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'dist');
const target = resolve(root, 'worker-assets');
const html = await readFile(resolve(source, 'index.html'), 'utf8');
if (!html.includes('/election2026/assets/')) throw new Error('Worker build must use PUBLIC_BASE_PATH=/election2026/');
if (!(await stat(resolve(source, 'reports')).catch(() => null))?.isDirectory()) throw new Error('Pre-rendered report pages are missing');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, resolve(target, 'election2026'), { recursive: true });
// robots.txt is only meaningful at the host root, which remains owned by TFC.
await rm(resolve(target, 'election2026/robots.txt'), { force: true });
await writeFile(resolve(target, '404.html'), await readFile(resolve(source, '404.html')));
console.log('Staged Cloudflare assets at worker-assets/election2026/');
