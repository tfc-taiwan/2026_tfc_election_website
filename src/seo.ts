import type { Listings, Report } from './data.ts';

export type SeoContext = { siteUrl: string | null; previewOrigin: string };
export type PageStatus = 'ready' | 'loading' | 'not-found' | 'error';
type MetaTag = { name?: string; property?: string; content: string };
export type SeoResult = { title: string; canonical?: string; tags: MetaTag[]; graph: Record<string, unknown>[]; robots: string };

export function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SITE_URL must be an HTTP(S) origin without a path, query, or credentials.');
  }
  return url.origin;
}

export function canIndexSite(data: Listings, context: SeoContext): boolean {
  const configured = normalizeSiteUrl(context.siteUrl ?? data.seo.siteUrl);
  if (!configured || data.isMock) return false;
  const url = new URL(configured);
  return url.protocol === 'https:' && !/^(localhost|127\.|\[::1\])/.test(url.hostname) && !/\.(invalid|test|localhost)$/.test(url.hostname);
}

export function originFor(data: Listings, context: SeoContext): string {
  return normalizeSiteUrl(context.siteUrl ?? data.seo.siteUrl) ?? normalizeSiteUrl(context.previewOrigin)!;
}

export function buildSeo(data: Listings, location: string, report: Report | null, context: SeoContext, status: PageStatus = 'ready'): SeoResult {
  const origin = originFor(data, context);
  const url = new URL(location, origin);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isListing = path === '/reports';
  const isArticle = path.startsWith('/reports/');
  const isQuery = isListing && (url.searchParams.has('q') || url.searchParams.has('category'));
  const missing = status === 'not-found' || (!['/', '/reports'].includes(path) && !isArticle);
  const page = report?.seo ?? (isListing ? data.seo.reports : data.seo.home);
  const title = missing ? `找不到頁面｜${data.site.name}` : status === 'error' ? `資料暫時無法載入｜${data.site.name}` : isQuery ? `搜尋與篩選結果｜${data.site.name}` : status === 'loading' ? `載入內容中｜${data.site.name}` : page.title;
  const description = missing ? '找不到這個頁面，請回到首頁或查核報告列表。' : status === 'error' ? '資料暫時無法載入，請稍後重試。' : page.description;
  const ready = status === 'ready' && !missing && (!isArticle || !!report);
  const index = ready && canIndexSite(data, context) && !page.noindex && !report?.isMock && !isQuery;
  const robots = index ? 'index, follow, max-image-preview:large' : data.isMock || report?.isMock || !canIndexSite(data, context) ? 'noindex, nofollow' : 'noindex, follow';
  const canonical = ready ? `${origin}${isListing ? '/reports' : path}` : undefined;
  const imageUrl = new URL(page.image.src, origin).href;
  const tags: MetaTag[] = [
    { name: 'description', content: description }, { name: 'robots', content: robots },
    { property: 'og:title', content: title }, { property: 'og:description', content: description },
    { property: 'og:type', content: report && ready ? 'article' : 'website' },
    { property: 'og:site_name', content: data.site.name }, { property: 'og:locale', content: data.seo.locale },
    { property: 'og:image', content: imageUrl }, { property: 'og:image:alt', content: page.image.alt },
    { property: 'og:image:width', content: String(page.image.width) }, { property: 'og:image:height', content: String(page.image.height) },
    { property: 'og:image:type', content: page.image.type },
    { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description }, { name: 'twitter:image', content: imageUrl }, { name: 'twitter:image:alt', content: page.image.alt },
  ];
  if (canonical) tags.push({ property: 'og:url', content: canonical });
  if (report && ready) {
    tags.push({ name: 'author', content: report.reporter }, { property: 'article:published_time', content: report.published },
      { property: 'article:modified_time', content: report.updated }, { property: 'article:section', content: report.category });
    report.tags.forEach(tag => tags.push({ property: 'article:tag', content: tag }));
  }
  const graph: Record<string, unknown>[] = [];
  if (canonical && ready && !isQuery) {
    const publisher = { '@id': `${origin}/#publisher` };
    const website = { '@id': `${origin}/#website` };
    graph.push({ '@type': 'Organization', ...publisher, name: data.site.name, alternateName: data.site.englishName, url: `${origin}/` });
    graph.push({ '@type': 'WebSite', ...website, name: data.site.title, url: `${origin}/`, inLanguage: data.seo.language, publisher });
    graph.push({ '@type': isListing ? 'CollectionPage' : 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: data.seo.language, isPartOf: website });
    if (isListing || report) {
      const items = [{ '@type': 'ListItem', position: 1, name: '首頁', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: report?.kind === 'analysis' ? '資訊操弄解析' : report?.kind === 'guide' ? '查核學堂' : '查核報告', item: report?.kind === 'analysis' ? `${origin}/#analysis` : report?.kind === 'guide' ? `${origin}/#learning` : `${origin}/reports` }];
      if (report) items.push({ '@type': 'ListItem', position: 3, name: report.title, item: canonical });
      graph.push({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: items });
    }
    if (isListing) graph.push({ '@type': 'ItemList', itemListElement: data.stories.filter(story => story.kind === 'report').map((story, index) => ({ '@type': 'ListItem', position: index + 1, name: story.title, url: `${origin}/reports/${story.slug}` })) });
    if (report) graph.push({
      '@type': report.kind === 'guide' ? 'Article' : 'NewsArticle', '@id': `${canonical}#article`,
      headline: report.title, description, url: canonical, mainEntityOfPage: { '@id': `${canonical}#webpage` },
      datePublished: report.published, dateModified: report.updated, inLanguage: data.seo.language,
      author: { '@type': report.seo.authorType, name: report.reporter }, publisher,
      image: { '@type': 'ImageObject', url: imageUrl, width: page.image.width, height: page.image.height, caption: page.image.alt },
      articleSection: report.category, keywords: report.tags.join(', '), isAccessibleForFree: true,
    });
  }
  return { title, canonical, tags, graph, robots };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
export function renderSeoHead(seo: SeoResult): string {
  return [
    `<title data-seo>${escapeHtml(seo.title)}</title>`,
    ...seo.tags.map(tag => `<meta data-seo ${tag.name ? `name="${tag.name}"` : `property="${tag.property}"`} content="${escapeHtml(tag.content)}">`),
    ...(seo.canonical ? [`<link data-seo rel="canonical" href="${escapeHtml(seo.canonical)}">`] : []),
    ...(seo.graph.length ? [`<script data-seo type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': seo.graph })}</script>`] : []),
  ].join('\n');
}

export function syncSeoHead(seo: SeoResult) {
  const fragment = document.createElement('template');
  fragment.innerHTML = renderSeoHead(seo);
  document.head.querySelectorAll('[data-seo]').forEach(node => node.remove());
  document.head.append(fragment.content);
  document.title = seo.title;
}

export function sitemapXml(data: Listings, reports: Report[], context: SeoContext): string {
  const origin = originFor(data, context);
  const entries: { path: string; lastmod?: string }[] = [];
  if (canIndexSite(data, context)) {
    if (!data.seo.home.noindex) entries.push({ path: '/' });
    if (!data.seo.reports.noindex) entries.push({ path: '/reports' });
    reports.filter(report => !report.isMock && !report.seo.noindex).forEach(report => entries.push({ path: `/reports/${report.slug}`, lastmod: report.updated }));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry => `  <url><loc>${escapeHtml(origin + entry.path)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}
export function robotsTxt(data: Listings, context: SeoContext): string {
  // Crawlers must be allowed to read the HTML noindex directive, even in mock mode.
  return `User-agent: *\nAllow: /\n${canIndexSite(data, context) ? `Sitemap: ${originFor(data, context)}/sitemap.xml\n` : '# Preview/mock mode: pages carry noindex; sitemap is intentionally empty.\n'}`;
}
