import { reportAliases } from './src/report-aliases.ts';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readListings, readReports, renderPage, robotsTxt, sitemapXml } from './.server/entry-server.js';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
const dataDir = resolve(process.env.DATA_DIR || (existsSync(resolve(root, 'data/listings.json')) ? resolve(root, 'data') : resolve(dist, 'data')));
const template = await readFile(resolve(root, '.server/template.html'), 'utf8');
const config = JSON.parse(await readFile(resolve(root, '.server/config.json'), 'utf8'));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const context = { siteUrl: process.env.SITE_URL || config.siteUrl, previewOrigin: `http://localhost:${port}` };
const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function send(req, res, status, type, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache');
  try {
    if (!['GET', 'HEAD'].includes(req.method || '')) { res.setHeader('Allow', 'GET, HEAD'); return send(req, res, 405, 'text/plain; charset=utf-8', 'Method not allowed'); }
    const url = new URL(req.url || '/', context.previewOrigin);
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return send(req, res, 400, 'text/plain; charset=utf-8', 'Invalid URL'); }
    const legacyReport = /^\/reports\/([^/]+)\/?$/.exec(path);
    const replacement = legacyReport && reportAliases[legacyReport[1]];
    if (replacement) { res.statusCode = 308; res.setHeader('Location', '/reports/' + replacement + url.search); res.end(); return; }
    if (path === '/index.html' || path.length > 1 && path.endsWith('/')) {
      res.statusCode = 308; res.setHeader('Location', (path === '/index.html' ? '/' : path.replace(/\/+$/, '')) + url.search); res.end(); return;
    }
    if (path.startsWith('/data/') || path.startsWith('/images/') || path.startsWith('/assets/') || ['/favicon.svg', '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png'].includes(path)) {
      const base = path.startsWith('/data/') ? dataDir : dist;
      const file = resolve(base, path.startsWith('/data/') ? path.slice(6) : `.${path}`);
      const within = relative(base, file);
      if (!within || within.startsWith('..') || within.split(/[\\/]/).some(part => part.startsWith('.')) || !(await stat(file).catch(() => null))?.isFile()) {
        res.setHeader('X-Robots-Tag', 'noindex'); return send(req, res, 404, 'text/plain; charset=utf-8', 'Not found');
      }
      if (path.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (path.startsWith('/data/')) res.setHeader('X-Robots-Tag', 'noindex');
      return send(req, res, 200, types[extname(file)] || 'application/octet-stream', await readFile(file));
    }
    if (path === '/robots.txt' || path === '/sitemap.xml') {
      const data = readListings(dataDir);
      return send(req, res, 200, path === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8',
        path === '/robots.txt' ? robotsTxt(data, context) : sitemapXml(data, readReports(dataDir, data), context));
    }
    const page = renderPage(template, path + url.search, dataDir, context);
    res.setHeader('X-Robots-Tag', page.robots);
    send(req, res, page.status, 'text/html; charset=utf-8', page.html);
  } catch (error) {
    console.error('Unable to render request:', error.message);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    send(req, res, 503, 'text/html; charset=utf-8', '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>資料暫時無法載入</title></head><body><h1>資料暫時無法載入</h1><p>請稍後重新整理。</p></body></html>');
  }
});
server.listen(port, host, () => {
  const actualPort = server.address().port;
  context.previewOrigin = `http://localhost:${actualPort}`;
  console.log(`SEO preview/server: http://${host}:${actualPort}`);
});
