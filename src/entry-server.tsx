import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import type { RenderState } from './render-state';
import { buildSeo, normalizeSiteUrl, renderSeoHead, robotsTxt, safeJson, sitemapXml, type SeoContext } from './seo';
import { readListings, readReport, readReports } from '../server/content';
import { basePath, localPath } from './paths';
import { infographicPaths, resolveInfographic } from './infographics';

export { readListings, readReports, robotsTxt, sitemapXml, infographicPaths };

export function renderPage(template: string, location: string, dataDir: string, context: SeoContext) {
  const data = readListings(dataDir);
  const pathname = localPath(new URL(location, context.previewOrigin).pathname.replace(/\/+$/, '') || '/');
  const report = pathname?.startsWith('/reports/') ? readReport(dataDir, pathname.slice('/reports/'.length)) : null;
  const status = pathname === '/' || pathname === '/reports' || report || (pathname && resolveInfographic(data, pathname)) ? 200 : 404;
  const initial: RenderState = { data, report, status, now: new Date().toISOString(), context: { ...context, siteUrl: normalizeSiteUrl(context.siteUrl ?? data.seo.siteUrl) } };
  const seo = buildSeo(data, location, report, initial.context, status === 404 ? 'not-found' : 'ready');
  const markup = renderToString(<StaticRouter location={location} basename={basePath || undefined}><App initial={initial} /></StaticRouter>);
  const html = template.replace('<!--seo-head-->', () => renderSeoHead(seo))
    .replace('<!--app-html-->', () => markup)
    .replace('<!--app-data-->', () => `<script id="__TFC_DATA__" type="application/json">${safeJson(initial)}</script>`);
  return { html, status, robots: seo.robots };
}
