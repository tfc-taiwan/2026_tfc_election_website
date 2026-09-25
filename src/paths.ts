// Vite replaces BASE_URL in client and SSR builds. Node-only tests use the root preview.
export const basePath = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '') || '';

export function publicPath(path: string): string {
  if (/^https:\/\//.test(path)) return path;
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}

export function localPath(path: string): string | null {
  if (!basePath) return path;
  if (path === basePath || path === `${basePath}/`) return '/';
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : null;
}
