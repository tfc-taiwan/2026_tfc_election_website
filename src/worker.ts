import { reportAliases } from './report-aliases.ts';
type Env = { ASSETS: { fetch(request: Request): Promise<Response> }; DEPLOYMENT_ENV?: string };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname === '/election2026') {
      url.pathname += '/';
      return Response.redirect(url, 308);
    }
    if (!url.pathname.startsWith('/election2026/')) return new Response('Not found', { status: 404 });
    const legacyReport = /^\/election2026\/reports\/([^/]+)\/?$/.exec(url.pathname);
    const replacement = legacyReport && reportAliases[legacyReport[1]];
    if (replacement) { url.pathname = `/election2026/reports/${replacement}`; return Response.redirect(url, 308); }
    // Earlier native share sheets appended the card caption after a space. Preserve those links.
    const captionSuffix = url.pathname.match(/^(\/election2026\/infographics\/[a-z0-9-]+\/[1-9]\d*)%20[^/]+$/i);
    if (captionSuffix) {
      url.pathname = captionSuffix[1];
      return Response.redirect(url, 308);
    }
    if (url.pathname !== '/election2026/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
      return Response.redirect(url, 308);
    }
    const assetUrl = new URL(request.url);
    if (assetUrl.pathname !== '/election2026/' && !assetUrl.pathname.split('/').at(-1)?.includes('.')) assetUrl.pathname += '/';
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));
    const headers = new Headers(response.headers);
    const type = headers.get('content-type') || '';
    if (type.includes('text/html') || type.includes('application/json') || type.includes('application/xml')) headers.set('Cache-Control', 'no-cache');
    if (url.pathname.startsWith('/election2026/data/')) headers.set('X-Robots-Tag', 'noindex');
    if (url.pathname === '/election2026/reports' && url.search) headers.set('X-Robots-Tag', 'noindex, follow');
    if (env.DEPLOYMENT_ENV === 'preview') headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
