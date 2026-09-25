import { test, expect } from '@playwright/test';

for (const width of [320, 390, 834, 1440]) {
  test(`home, report and shared infographic render without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.demo-notice')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('台灣地方選舉');
    const social = page.getByRole('navigation', { name: '社群媒體' });
    await expect(social.getByRole('link')).toHaveCount(5);
    await expect(social.getByRole('link', { name: /YouTube/ })).toHaveAttribute('href', 'https://www.youtube.com/channel/UCRrO7rwIR0n7P1K2Fc7CIXA');
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
    await page.goto('/infographics/ai-tools/2');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('如何使用 AI 工具輔助查證');
    await expect(page.locator('.infographic-viewer img')).toBeVisible();
    await expect(page.getByRole('link', { name: '閱讀原文章' })).toHaveAttribute('href', '/reports/ai-tools');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/infographic-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('separate report sections, carousel, accordion, mobile navigation, and modal work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const players: Array<{ playCount: number; stopCount: number; trigger: (data: number) => void }> = [];
    class MockPlayer {
      playCount = 0;
      stopCount = 0;
      private readonly onStateChange: (event: { data: number; target: MockPlayer }) => void;
      constructor(_frame: HTMLIFrameElement, options: { events: { onStateChange: (event: { data: number; target: MockPlayer }) => void } }) {
        this.onStateChange = options.events.onStateChange;
        players.push(this);
      }
      playVideo() { this.playCount += 1; }
      stopVideo() { this.stopCount += 1; }
      destroy() {}
      trigger(data: number) { this.onStateChange({ data, target: this }); }
    }
    Object.assign(window, { YT: { Player: MockPlayer, PlayerState: { PLAYING: 1 } }, __youtubePlayers: players });
  });
  await page.goto('/');
  await expect(page.locator('#latest .story-card')).toHaveCount(5);
  await expect(page.locator('#latest .story-card').first()).toContainText('網傳候選人賄選錄音？實為變造');
  await expect(page.locator('#latest .story-card').nth(1)).toContainText('圖文流傳「新選票設計會透光，作票更容易」？錯誤訊息');
  await expect(page.locator('#referendum .story-card')).toHaveCount(3);
  await expect(page.locator('#referendum .story-card').first()).toContainText('公投通知');
  await expect(page.locator('#shorts .short-card')).toHaveCount(3);
  await expect(page.locator('#shorts iframe')).toHaveCount(3);
  await expect(page.locator('#shorts .short-preview')).toHaveCount(3);
  await expect(page.locator('#shorts .short-preview img').first()).toHaveAttribute('src', /i\.ytimg\.com\/vi\/GoRukYrdkdE\/maxresdefault\.jpg$/);
  await expect.poll(() => page.evaluate(() => (window as Window & { __youtubePlayers?: unknown[] }).__youtubePlayers?.length ?? 0)).toBe(3);
  await page.locator('#shorts .short-preview').first().click();
  await expect(page.locator('#shorts .short-preview')).toHaveCount(2);
  const firstPlayCounts = await page.evaluate(() => (window as unknown as { __youtubePlayers: Array<{ playCount: number }> }).__youtubePlayers.map(player => player.playCount));
  expect(firstPlayCounts).toEqual([1, 0, 0]);
  await page.evaluate(() => (window as unknown as { __youtubePlayers: Array<{ trigger: (data: number) => void }> }).__youtubePlayers[0].trigger(1));
  await page.locator('#shorts .short-preview').first().click();
  const finalCounts = await page.evaluate(() => (window as unknown as { __youtubePlayers: Array<{ playCount: number; stopCount: number }> }).__youtubePlayers.map(player => ({ play: player.playCount, stop: player.stopCount })));
  expect(finalCounts).toEqual([{ play: 1, stop: 1 }, { play: 1, stop: 0 }, { play: 0, stop: 0 }]);
  await expect(page.locator('#infographics .infographic-card')).toHaveCount(3);
  const next = page.getByRole('button', { name: '地方選舉查核報告：下一組' });
  await next.click();
  await expect.poll(() => page.locator('#latest .carousel-track').evaluate(el => el.scrollLeft)).toBeGreaterThan(200);
  await page.getByRole('button', { name: '公投議題查核報告：下一組' }).click();
  await expect.poll(() => page.locator('#referendum .carousel-track').evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await page.getByRole('button', { name: '外部勢力：閱讀常見劇本' }).click();
  await expect(page.locator('#script-counting-system')).toBeVisible();
  await page.getByRole('button', { name: '劇本三：駭客能直接改掉開票結果？' }).click();
  await expect(page.locator('#script-counting-system')).toBeHidden();
  await page.getByRole('button', { name: /了解更多.*選前準備/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('navigation', { name: '手機快速導覽' }).getByRole('button', { name: '開啟選單' }).click();
  await page.getByRole('navigation', { name: '主要導覽' }).getByRole('link', { name: '查核報告', exact: true }).click();
  await expect(page).toHaveURL('/reports');
  await expect(page.getByRole('button', { name: '開啟選單' })).toHaveAttribute('aria-expanded', 'false');
});

test('search results, filters, empty state, and browser history', async ({ page }) => {
  await page.goto('/reports?q=音檔');
  await expect(page.locator('.listing-search')).toHaveCount(0);
  await expect(page.locator('.listing-grid .story-card').first()).toContainText('錄音檔');
  await page.getByRole('button', { name: '公投議題', exact: true }).click();
  await expect(page.getByRole('heading', { name: '沒有找到符合的內容' })).toBeVisible();
  await page.getByRole('button', { name: '清除搜尋與篩選' }).click();
  await expect(page.locator('.listing-grid .story-card')).toHaveCount(8);
  await page.goBack();
  await expect(page.getByRole('heading', { name: '沒有找到符合的內容' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/reports?q=%E9%9F%B3%E6%AA%94');
  await expect(page.locator('.listing-grid .story-card').first()).toContainText('錄音檔');
});

test('search submits to the main TFC site and infographic cards open an accessible gallery', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: async (value: ShareData) => { (window as Window & { sharedCard?: ShareData }).sharedCard = value; }, configurable: true });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://tfc-taiwan.org.tw/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>原站搜尋</h1>' }));
  await page.goto('/');
  const opener = page.getByRole('button', { name: /查看圖卡：.*AI/ });
  await opener.click();
  const gallery = page.getByRole('dialog', { name: '圖卡大圖瀏覽' });
  await expect(gallery).toBeVisible();
  await expect(gallery).toContainText('1 / 3');
  await gallery.getByRole('button', { name: '下一張' }).click();
  await expect(gallery).toContainText('2 / 3');
  await gallery.getByRole('button', { name: '分享這張圖卡' }).click();
  expect(await page.evaluate(() => (window as Window & { sharedCard?: ShareData }).sharedCard)).toEqual({ url: 'http://127.0.0.1:5173/infographics/ai-tools/2' });
  await gallery.getByRole('link', { name: '開啟圖卡專頁' }).click();
  await expect(page).toHaveURL(/\/infographics\/ai-tools\/2$/);
  await expect(page.locator('.infographic-viewer figcaption')).toContainText('觀察影像或聲音的來源與脈絡');
  await page.getByRole('button', { name: '分享這張圖卡' }).click();
  expect(await page.evaluate(() => (window as Window & { sharedCard?: ShareData }).sharedCard)).toEqual({ url: 'http://127.0.0.1:5173/infographics/ai-tools/2' });
  await page.reload();
  await expect(page.locator('.infographic-viewer figcaption')).toContainText('觀察影像或聲音的來源與脈絡');
  await page.getByRole('link', { name: '下一張' }).click();
  await expect(page).toHaveURL(/\/infographics\/ai-tools\/3$/);
  await page.getByRole('link', { name: '返回圖卡列表' }).click();
  await expect(page).toHaveURL(/\/#infographics$/);
  await opener.click();
  await page.keyboard.press('ArrowLeft');
  await expect(gallery).toContainText('3 / 3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(gallery).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.getByRole('button', { name: '前往搜尋' }).click();
  await page.getByRole('searchbox', { name: '搜尋台灣事實查核中心' }).fill('選舉');
  await page.getByRole('button', { name: '送出搜尋' }).click();
  await expect(page).toHaveURL('https://tfc-taiwan.org.tw/?s=%E9%81%B8%E8%88%89');
});

for (const width of [390, 1440]) {
  test(`infographic slide navigation keeps the reading position at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 650 });
    await page.goto('/infographics/ai-tools/1');
    const next = page.getByRole('link', { name: '下一張' });
    await next.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 220));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(100);
    await next.click();
    await expect(page).toHaveURL(/\/infographics\/ai-tools\/2$/);
    await expect(page.locator('.infographic-viewer figcaption')).toContainText('觀察影像或聲音的來源與脈絡');
    expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(5);
    await page.getByRole('link', { name: '上一張' }).click();
    await expect(page).toHaveURL(/\/infographics\/ai-tools\/1$/);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(5);
  });
}

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
