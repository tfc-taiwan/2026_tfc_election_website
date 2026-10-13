import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const listings = JSON.parse(readFileSync('data/listings.json', 'utf8'));
for (const width of [320, 390, 834, 1440]) {
  test(`latest content, guide and images at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/election2026/');
    await expect(page.locator('#latest .story-card')).toHaveCount(4);
    await expect(page.locator('#learning')).toContainText('選前準備篇');
    await expect(page.locator('footer')).toContainText('示範');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/election2026/reports');
    await expect(page.locator('.listing-grid .story-card')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/election2026/reports/election-prepare');
    await expect(page.locator('h1')).toHaveText(listings.stories.find((s: { slug: string }) => s.slug === 'election-prepare').title);
    await expect(page.locator('#verification h3')).toHaveCount(5);
    await expect(page.locator('.article-cover img')).toBeVisible();
    expect(await page.locator('.article-cover img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/worker-guide-${width}.png`, fullPage: true });
  });
}

test('Worker serves matching JSON, pre-rendered guide, search target and real 404', async ({ browser, request }) => {
  const response = await request.get('/election2026/data/listings.json');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(listings);
  expect((await request.get('/election2026/reports/missing')).status()).toBe(404);
  expect((await request.get('/')).status()).toBe(404);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8787/election2026/reports/election-prepare');
  await expect(page.locator('#verification')).toContainText('Q5、候選人有誰？');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tfc-taiwan.org.tw/election2026/reports/election-prepare');
  await context.close();
  const interactive = await browser.newPage();
  await interactive.goto('http://127.0.0.1:8787/election2026/');
  await interactive.getByRole('button', { name: '前往搜尋', exact: true }).click();
  await expect(interactive.locator('form[role="search"]')).toHaveAttribute('action', 'https://tfc-taiwan.org.tw/');
  await expect(interactive.locator('form[role="search"]')).toHaveAttribute('method', 'get');
  await expect(interactive.locator('form[role="search"] input')).toHaveAttribute('name', 's');
  await interactive.close();
});
