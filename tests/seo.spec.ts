import { test, expect } from '@playwright/test';

test('initial HTTP responses include complete metadata and article content without JavaScript', async ({ request, browser }) => {
  for (const path of ['/', '/reports', '/reports/ai-voice', '/reports/ballot-paper']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/<meta data-seo name="description" content="[^"<]+"/);
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('<!--app-html-->');
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL(path, response.url()).href);
    await expect(page.locator('h1')).toBeVisible();
    if (path.startsWith('/reports/')) await expect(page.locator('#verification')).toContainText('查核');
    await context.close();
  }
});

test('SPA navigation keeps a single correct metadata set and clears article data on search and errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#latest .story-card').first().click();
  await expect(page).toHaveTitle(/私下賄選錄音檔/);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/reports\/ai-voice$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.locator('.related-reports .story-card').first().click();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /ballot-paper\.png$/);
  await page.goBack();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /ai-voice\.png$/);
  await page.getByRole('searchbox', { name: '搜尋查核報告', exact: true }).fill('音檔');
  await page.getByRole('button', { name: '送出搜尋' }).click();
  await expect(page).toHaveTitle(/搜尋與篩選結果/);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await page.goto('/reports/missing');
  await expect(page).toHaveTitle(/找不到頁面/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(errors).toEqual([]);
});

test('crawler assets, share PNGs and actual error HTTP statuses are available', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain('Allow: /');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain('<urlset');
  expect(await sitemap.text()).not.toContain('<loc>');
  const image = await request.get('/images/og/ai-voice.png');
  expect(image.headers()['content-type']).toContain('image/png');
  expect((await image.body()).readUInt32BE(16)).toBe(1200);
  for (const path of ['/reports/missing', '/missing']) expect((await request.get(path)).status()).toBe(404);
  expect((await request.get('/reports?q=音檔')).headers()['x-robots-tag']).toContain('noindex');
});
