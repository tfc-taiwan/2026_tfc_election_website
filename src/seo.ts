import type { Listings, Report } from './data.ts';
import { basePath, localPath, publicPath } from './paths.ts';
import { infographicPath, resolveInfographic } from './infographics.ts';

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

export function siteRootFor(data: Listings, context: SeoContext): string {
  return originFor(data, context) + basePath;
}

export function buildSeo(data: Listings, location: string, report: Report | null, context: SeoContext, status: PageStatus = 'ready'): SeoResult {
  const origin = originFor(data, context);
  const url = new URL(location, origin);
  const rawPath = url.pathname.replace(/\/+$/, '') || '/';
  // React Router strips basename from useLocation(); SSR receives the full public path.
  const path = rawPath === '/' || rawPath === '/reports' || rawPath.startsWith('/reports/') || rawPath.startsWith('/infographics/') ? rawPath : localPath(rawPath) ?? '/not-found';
  const isListing = path === '/reports';
  const isArticle = path.startsWith('/reports/');
  const infographic = resolveInfographic(data, path);
  const isQuery = isListing && (url.searchParams.has('q') || url.searchParams.has('category'));
  const missing = status === 'not-found' || (!['/', '/reports'].includes(path) && !isArticle && !infographic);
  const page = infographic ? {
    title: `${infographic.story.title}｜圖卡 ${infographic.number}/${infographic.group.cards.length}｜${data.site.name}`,
    description: `${infographic.card.caption}。${infographic.story.description}`,
    image: { src: `/images/og/cards/${infographic.group.slug}-${infographic.number}.png`, alt: infographic.card.image.alt, width: 1200, height: 630, type: 'image/png' },
    noindex: data.seo.home.noindex,
  } : report?.seo ?? (isListing ? data.seo.reports : data.seo.home);
  const title = missing ? `找不到頁面｜${data.site.name}` : status === 'error' ? `資料暫時無法載入｜${data.site.name}` : isQuery ? `搜尋與篩選結果｜${data.site.name}` : status === 'loading' ? `載入內容中｜${data.site.name}` : page.title;
  const description = missing ? '找不到這個頁面，請回到首頁或查核報告列表。' : status === 'error' ? '資料暫時無法載入，請稍後重試。' : page.description;
  const ready = status === 'ready' && !missing && (!isArticle || !!report);
  const index = ready && canIndexSite(data, context) && !page.noindex && !report?.isMock && !isQuery;
  const robots = index ? 'index, follow, max-image-preview:large' : data.isMock || report?.isMock || !canIndexSite(data, context) ? 'noindex, nofollow' : 'noindex, follow';
  const canonical = ready ? `${origin}${publicPath(isListing ? '/reports' : path)}` : undefined;
  const imageUrl = new URL(publicPath(page.image.src), origin).href;
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
    tags.push({ name: 'author', content: report.reporter }, { property: 'article:section', content: report.category });
    if (report.published) tags.push({ property: 'article:published_time', content: report.published });
    if (report.updated) tags.push({ property: 'article:modified_time', content: report.updated });
    report.tags.forEach(tag => tags.push({ property: 'article:tag', content: tag }));
  }
  const graph: Record<string, unknown>[] = [];
  if (canonical && ready && !isQuery) {
    const siteRoot = `${siteRootFor(data, context)}/`;
    const publisher = { '@id': `${siteRoot}#publisher` };
    const website = { '@id': `${siteRoot}#website` };
    graph.push({ '@type': 'Organization', ...publisher, name: data.site.name, alternateName: data.site.englishName, url: siteRoot });
    graph.push({ '@type': 'WebSite', ...website, name: data.site.title, url: siteRoot, inLanguage: data.seo.language, publisher });
    graph.push({ '@type': isListing ? 'CollectionPage' : 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: data.seo.language, isPartOf: website, ...(infographic ? { primaryImageOfPage: { '@id': `${canonical}#image` } } : {}) });
    if (isListing || report || infographic) {
      const items = [{ '@type': 'ListItem', position: 1, name: '首頁', item: siteRoot },
        { '@type': 'ListItem', position: 2, name: infographic ? '圖卡懶人包' : report?.kind === 'analysis' ? '資訊操弄解析' : report?.kind === 'guide' ? '查核學堂' : '查核報告', item: infographic ? `${siteRoot}#infographics` : report?.kind === 'analysis' ? `${siteRoot}#analysis` : report?.kind === 'guide' ? `${siteRoot}#learning` : `${siteRootFor(data, context)}/reports` }];
      if (report) items.push({ '@type': 'ListItem', position: 3, name: report.title, item: canonical });
      if (infographic) items.push({ '@type': 'ListItem', position: 3, name: `${infographic.story.title} 圖卡 ${infographic.number}`, item: canonical });
      graph.push({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumbs`, itemListElement: items });
    }
    if (infographic) graph.push({ '@type': 'ImageObject', '@id': `${canonical}#image`, contentUrl: new URL(publicPath(infographic.card.image.src), origin).href, thumbnailUrl: imageUrl, caption: infographic.card.caption, name: `${infographic.story.title} 圖卡 ${infographic.number}` });
    if (isListing) graph.push({ '@type': 'ItemList', itemListElement: data.stories.filter(story => story.kind === 'report').map((story, index) => ({ '@type': 'ListItem', position: index + 1, name: story.title, url: `${siteRootFor(data, context)}/reports/${story.slug}` })) });
    if (report) graph.push({
      '@type': report.kind === 'guide' ? 'Article' : 'NewsArticle', '@id': `${canonical}#article`,
      headline: report.title, description, url: canonical, mainEntityOfPage: { '@id': `${canonical}#webpage` },
      ...(report.published ? { datePublished: report.published } : {}), ...(report.updated ? { dateModified: report.updated } : {}), inLanguage: data.seo.language,
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
    reports.filter(report => !report.isMock && !report.seo.noindex).forEach(report => entries.push({ path: `/reports/${report.slug}`, lastmod: report.updated ?? undefined }));
    if (!data.seo.home.noindex) (data.sections.infographics?.items ?? []).forEach(group => {
      const report = reports.find(item => item.slug === group.slug);
      if (report && !report.isMock && !report.seo.noindex) group.cards.forEach((_, index) => entries.push({ path: infographicPath(group.slug, index + 1), lastmod: report.updated ?? undefined }));
    });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry => `  <url><loc>${escapeHtml(origin + publicPath(entry.path))}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
}
export function robotsTxt(data: Listings, context: SeoContext): string {
  // Crawlers must be allowed to read the HTML noindex directive, even in mock mode.
  return `User-agent: *\nAllow: /\n${canIndexSite(data, context) ? `Sitemap: ${siteRootFor(data, context)}/sitemap.xml\n` : '# Preview/mock mode: pages carry noindex; sitemap is intentionally empty.\n'}`;
}
