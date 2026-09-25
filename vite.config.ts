import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dataDir = fileURLToPath(new URL('./data', import.meta.url));

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), 'SITE_');
  const siteUrl = process.env.SITE_URL || env.SITE_URL || null;
  const base = process.env.PUBLIC_BASE_PATH || '/';
  return {
  base,
  plugins: [react(), {
    name: 'render-json-pages',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const location = req.url ?? '/';
        const pathname = new URL(location, 'http://localhost').pathname;
        if (!['GET', 'HEAD'].includes(req.method ?? '') || pathname.startsWith('/data/') || pathname.startsWith('/images/') || pathname.startsWith('/src/') || pathname.startsWith('/@') || pathname.startsWith('/node_modules/') || pathname.includes('.') && !['/robots.txt', '/sitemap.xml'].includes(pathname)) return next();
        try {
          const renderer = await server.ssrLoadModule('/src/entry-server.tsx');
          const previewOrigin = server.resolvedUrls?.local[0]?.replace(/\/$/, '') ?? `http://127.0.0.1:${server.config.server.port ?? 5173}`;
          const context = { siteUrl, previewOrigin };
          if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
            const data = renderer.readListings(dataDir);
            const result = pathname === '/robots.txt' ? renderer.robotsTxt(data, context) : renderer.sitemapXml(data, renderer.readReports(dataDir, data), context);
            res.setHeader('Content-Type', pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8');
            res.end(req.method === 'HEAD' ? undefined : result);
            return;
          }
          const template = await server.transformIndexHtml(location, readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'));
          const page = renderer.renderPage(template, location, dataDir, context);
          res.statusCode = page.status;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Robots-Tag', page.robots);
          res.end(req.method === 'HEAD' ? undefined : page.html);
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    },
  }, {
    name: 'publish-editorial-json',
    // JSON remains separate from JavaScript and can be replaced without rebuilding the app.
    generateBundle() {
      if (isSsrBuild) return;
      for (const path of readdirSync(dataDir, { recursive: true, encoding: 'utf8' })) {
        if (!path.endsWith('.json')) continue;
        this.emitFile({ type: 'asset', fileName: `data/${path.replaceAll('\\', '/')}`, source: readFileSync(resolve(dataDir, path), 'utf8') });
      }
    },
  }],
  build: isSsrBuild ? { copyPublicDir: false } : {},
};
});
