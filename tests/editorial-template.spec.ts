import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { convertEditorialTemplate } from '../scripts/editorial-template.ts';
import { sampleMarkdown, sampleMetadata, sampleTitle } from './fixtures/editorial-sample.ts';
import { listingsSchema } from '../src/data.ts';

const listings = listingsSchema.parse(JSON.parse(await readFile(new URL('../data/listings.json', import.meta.url), 'utf8')));
for (const width of [390, 834, 1440]) {
  test(`converted template renders images, formatting and supplements at ${width}px`, async ({ page }) => {
    const { report, assets } = await convertEditorialTemplate(sampleMarkdown, listings, sampleMetadata);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/data/reports/ai-voice.json', route => route.fulfill({ json: report }));
    await page.route('**/images/imported/*', route => route.fulfill({ body: assets[0].bytes, contentType: 'image/png' }));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reports/ai-voice');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(sampleTitle);
    await expect(page.locator('#check-1 strong')).toHaveText('虛構素材');
    await expect(page.getByRole('link', { name: '來源格式示範' })).toHaveAttribute('href', 'https://example.org/evidence');
    const img = page.locator('#background figure > img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    const ratio = await img.evaluate((el: HTMLImageElement) => ({ actual: el.clientWidth / el.clientHeight, source: el.naturalWidth / el.naturalHeight }));
    expect(Math.abs(ratio.actual - ratio.source)).toBeLessThan(0.01);
    await expect(page.locator('#background figcaption')).toHaveText('圖一：範本原有的占位圖片，僅供測試。');
    await page.screenshot({ path: `test-results/editorial-background-${width}.png` });
    await page.locator('.article-toolbar').getByRole('link', { name: '補充資料', exact: true }).click();
    await expect(page).toHaveURL(/#supplementary$/);
    await expect(page.locator('#supplementary em')).toHaveText('圖片原始比例');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
