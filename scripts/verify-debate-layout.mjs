import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const data = JSON.parse(await readFile('data/listings.json', 'utf8'));
const pins = data.sections.reports.pinnedSlugs;
const category = data.stories.find(story => story.slug === pins[0]).category;
const categoryPath = `/reports?category=${encodeURIComponent(category)}`;
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  const origin = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Debate layout server startup timed out')), 15000);
    server.once('error', reject);
    server.stdout.on('data', chunk => {
      output += String(chunk);
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const raw = await (await fetch(origin + categoryPath)).text();
  assert.ok(raw.indexOf(`href="/reports/${pins[0]}"`) < raw.indexOf(`href="/reports/${pins[1]}"`), 'No-JS listing pin order');
  const executablePath = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  for (const width of [320, 390, 834, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(origin + '/reports', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: category, exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.locator('.listing-grid .story-card').evaluateAll(cards => cards.slice(0, 2).map(card => card.getAttribute('href'))), pins.map(slug => `/reports/${slug}`));
    assert.equal(await page.locator('.listing-grid .verdict-label').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px listing overflow`);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `/tmp/debate-listing-${width}.png`, fullPage: true });
    for (const slug of pins) {
      await page.goto(`${origin}/reports/${slug}`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => { img.loading = 'eager'; return img.decode(); })); });
      assert.equal(await page.locator('h1').textContent(), data.stories.find(story => story.slug === slug).title);
      assert.equal(await page.locator('.article-summary').count(), 0);
      assert.ok(!(await page.locator('.article-meta').textContent()).includes('報告編號'));
      assert.equal(await page.locator('.back-link').getAttribute('href'), categoryPath);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px article overflow`);
      if (width === 390) await page.screenshot({ path: `/tmp/${slug}-390.png`, fullPage: true });
    }
    console.log(`Verified debate pins and both article pages at ${width}px: correct order, links, decoded images, no report metadata or overflow.`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
