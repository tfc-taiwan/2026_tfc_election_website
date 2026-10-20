// Standalone review file. Production continues to use the existing Worker build.
import { build } from 'esbuild';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = process.cwd();
const output = resolve(root, 'generated/review');
await mkdir(output, { recursive: true });
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const assets = {};
async function embed(value) {
  if (typeof value === 'string' && value.startsWith('/images/')) {
    if (!assets[value]) { const bytes = await readFile(resolve(root, 'public' + value)); assets[value] = `data:${mime[extname(value)] || 'application/octet-stream'};base64,${bytes.toString('base64')}`; }
    return value;
  }
  if (Array.isArray(value)) return Promise.all(value.map(embed));
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await embed(item)])));
  return value;
}
const data = await embed(JSON.parse(await readFile('data/listings.json', 'utf8')));
const reports = {};
for (const file of await readdir('data/reports')) if (file.endsWith('.json')) reports[file.slice(0, -5)] = await embed(JSON.parse(await readFile('data/reports/' + file, 'utf8')));
const fontImports = ''; // Review uses system fonts to keep the single-file download small.
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './src/App';
import './src/styles.css';
${fontImports}
const {data,reports} = JSON.parse(document.getElementById('review-data').textContent);
const originalFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
 const path = typeof input === 'string' ? input : input.url;
 if (/\\/data\\/listings\\.json(?:[?#]|$)/.test(path)) return Promise.resolve(new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json'}}));
 const match = path.match(/\\/data\\/reports\\/([a-z0-9-]+)\\.json/);
 if(match) return Promise.resolve(new Response(JSON.stringify(reports[match[1]]),{status:reports[match[1]]?200:404,headers:{'Content-Type':'application/json'}}));
 return originalFetch(input, options);
};
const initial={data,now:new Date().toISOString(),context:{siteUrl:null,previewOrigin:'http://localhost:4173'},report:null,status:200};
createRoot(document.getElementById('root')).render(<MemoryRouter><App initial={initial}/></MemoryRouter>);`;
const compiled = await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, outdir: output, format: 'iife', minify: true, define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.BASE_URL': '"/"' }, loader: { '.woff': 'dataurl', '.woff2': 'dataurl' } });
const css = compiled.outputFiles.find(file => file.path.endsWith('.css'))?.text || '';
const js = compiled.outputFiles.find(file => file.path.endsWith('.js')).text;
await embed('/images/tfc-logo.png');
const payload = JSON.stringify({data,reports,assets}).replaceAll('<', '\\u003c');
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>選舉工具箱修改預覽</title><style>${css}</style><div id="root"></div><script id="review-data" type="application/json">${payload}</script><script>${js.replaceAll('</script', '<\\/script')}</script><script>const observer=new MutationObserver(()=>{const assets=JSON.parse(document.getElementById('review-data').textContent).assets;document.querySelectorAll('img').forEach(img=>{const src=img.getAttribute('src');if(assets[src])img.src=assets[src]})});observer.observe(document.getElementById('root'),{childList:true,subtree:true});</script></html>`;
await writeFile(resolve(output, 'review-preview.html'), html);
console.log(`Created generated/review/review-preview.html (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} MB)`);
