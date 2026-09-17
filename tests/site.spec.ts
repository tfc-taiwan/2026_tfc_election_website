import { test, expect } from '@playwright/test';

for (const width of [320, 390, 834, 1440]) {
  test(`home and report render without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('台灣地方選舉');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.story-card').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.locator('.story-card').first().click();
    await expect(page).toHaveURL(/\/reports\/ai-voice$/);
    await expect(page.getByRole('heading', { name: '查核摘要' })).toBeVisible();
    await expect(page.locator('.article-mock-note')).toContainText('虛構示範');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/report-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.locator('.report-page')).toBeVisible();
    await page.locator('.article-toolbar').getByRole('link', { name: '背景', exact: true }).click();
    await expect(page).toHaveURL(/#background$/);
    await page.locator('.related-reports .story-card').first().click();
    await expect(page).toHaveURL(/\/reports\/ballot-paper$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('選票');
    expect(errors).toEqual([]);
  });
}

test('category tabs, carousel, accordion, mobile navigation, and modal work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const next = page.getByRole('button', { name: '地方選舉查核報告：下一組' });
  await next.click();
  await expect.poll(() => page.locator('#latest .carousel-track').evaluate(el => el.scrollLeft)).toBeGreaterThan(200);
  await page.getByRole('button', { name: '公投議題', exact: true }).click();
  await expect(page.locator('#latest .story-card')).toHaveCount(3);
  await expect(page.locator('#latest .story-card').first()).toContainText('公投通知');
  await page.getByRole('button', { name: '外部勢力：閱讀常見劇本' }).click();
  await expect(page.locator('#script-counting-system')).toBeVisible();
  await page.getByRole('button', { name: '劇本三：駭客能直接改掉開票結果？' }).click();
  await expect(page.locator('#script-counting-system')).toBeHidden();
  await page.getByRole('button', { name: /了解更多.*選前準備/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '開啟選單' }).click();
  await page.getByRole('navigation', { name: '主要導覽' }).getByRole('link', { name: '查核報告', exact: true }).click();
  await expect(page).toHaveURL('/reports');
  await expect(page.getByRole('button', { name: '開啟選單' })).toHaveAttribute('aria-expanded', 'false');
});

test('search results, filters, empty state, and browser history', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: '搜尋查核報告', exact: true }).fill('音檔');
  await page.getByRole('button', { name: '送出搜尋' }).click();
  await expect(page.locator('.listing-grid .story-card').first()).toContainText('錄音檔');
  await page.getByRole('button', { name: '公投議題', exact: true }).click();
  await expect(page.getByRole('heading', { name: '沒有找到符合的內容' })).toBeVisible();
  await page.getByRole('button', { name: '清除搜尋與篩選' }).click();
  await expect(page.locator('.listing-grid .story-card')).toHaveCount(8);
  await page.goBack();
  await expect(page.getByRole('heading', { name: '沒有找到符合的內容' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox', { name: '輸入搜尋關鍵字' })).toHaveValue('音檔');
});

test('runtime JSON drives listings and reports, with recoverable failure and missing routes', async ({ page }) => {
  await page.route('**/data/listings.json', async route => {
    const response = await route.fetch(); const json = await response.json();
    json.hero.title = ['JSON 動態載入測試'];
    await route.fulfill({ json });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('JSON 動態載入測試');
  let fail = true;
  await page.route('**/data/reports/ai-voice.json', async route => {
    if (fail) return route.fulfill({ status: 503 });
    const response = await route.fetch(); const json = await response.json(); json.title = '獨立文章 JSON 測試';
    await route.fulfill({ json });
  });
  await page.goto('/reports/ai-voice');
  await expect(page.getByRole('heading', { name: '資料暫時無法載入' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: '重新載入' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('獨立文章 JSON 測試');
  await page.goto('/reports/non-existent');
  await expect(page.getByRole('heading', { name: '這一頁，還沒有找到。' })).toBeVisible();
  await page.goto('/non-existent');
  await expect(page.getByRole('heading', { name: '這一頁，還沒有找到。' })).toBeVisible();
});

test('copy link and print retain demo context', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/reports/ai-voice');
  await page.getByRole('button', { name: '複製文章連結' }).click();
  await expect(page.getByRole('status')).toHaveText('已複製文章連結');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/reports/ai-voice');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.article-mock-note')).toBeVisible();
  await expect(page.locator('.article-toolbar')).toBeHidden();
  await expect(page.locator('.article-summary')).toBeVisible();
});
