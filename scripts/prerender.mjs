import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { readListings, readReports, renderPage, robotsTxt, sitemapXml } from '../.server/entry-server.js';

const root = process.cwd();
const env = loadEnv('production', root, 'SITE_');
const context = { siteUrl: process.env.SITE_URL || env.SITE_URL || null, previewOrigin: 'http://localhost:4173' };
const sourceDir = resolve(root, 'data');
let template = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (template.includes('<!--app-html-->')) await writeFile(resolve(root, '.server/template.html'), template);
else template = await readFile(resolve(root, '.server/template.html'), 'utf8');
await writeFile(resolve(root, '.server/config.json'), JSON.stringify(context));
const data = readListings(sourceDir);
const reports = readReports(sourceDir, data);
// These are generated output directories, never editorial source directories.
await rm(resolve(root, 'dist/reports'), { recursive: true, force: true });
await rm(resolve(root, 'dist/data'), { recursive: true, force: true });
await cp(sourceDir, resolve(root, 'dist/data'), { recursive: true });
await cp(resolve(root, 'public/images'), resolve(root, 'dist/images'), { recursive: true });
const paths = ['/', '/reports', ...reports.map(report => `/reports/${report.slug}`)];
for (const path of paths) {
  const result = renderPage(template, path, sourceDir, context);
  if (result.status !== 200) throw new Error(`Prerender failed: ${path}`);
  const directory = resolve(root, 'dist', `.${path}`);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), result.html);
}
await writeFile(resolve(root, 'dist/404.html'), renderPage(template, '/not-found', sourceDir, context).html);
await writeFile(resolve(root, 'dist/robots.txt'), robotsTxt(data, context));
await writeFile(resolve(root, 'dist/sitemap.xml'), sitemapXml(data, reports, context));
console.log(`Prerendered ${paths.length} pages, 404.html, robots.txt and sitemap.xml.`);
if (!context.siteUrl && !data.seo.siteUrl) console.log('SITE_URL is unset: local preview URLs and noindex are active; sitemap has no URLs.');
