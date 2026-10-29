import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const slug = 'reject-deepfake-election-disinformation-self-regulation-charter';
const expected = JSON.parse(await readFile(`data/reports/${slug}.json`, 'utf8')).organizationGroups;
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  const origin = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Organization layout server startup timed out')), 15000);
    server.once('error', reject);
    server.stdout.on('data', data => {
      output += String(data);
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const executablePath = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  for (const width of [320, 390, 834, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(`${origin}/reports/${slug}`, { waitUntil: 'networkidle' });
    await page.locator('.article-organizations').scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = [...document.querySelectorAll('.organization-logo img')];
      for (const image of images) image.loading = 'eager';
      await Promise.all(images.map(image => image.decode()));
    });
    const actual = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('.organization-group')];
      const sources = document.querySelector('#sources').getBoundingClientRect();
      return {
        groups: groups.map(group => ({
          title: group.querySelector('h2').textContent,
          names: [...group.querySelectorAll('.organization-name')].map(name => name.textContent),
          contained: [...group.querySelectorAll('.organization-card')].every(card => {
            const bounds = card.getBoundingClientRect();
            return bounds.left >= 0 && bounds.right <= innerWidth && card.scrollWidth <= card.clientWidth;
          }),
          beforeSources: group.getBoundingClientRect().bottom <= sources.top,
        })),
        logos: [...document.querySelectorAll('.organization-logo img')].filter(image => image.complete && image.naturalWidth > 0).length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.deepEqual(actual.groups.map(group => ({ title: group.title, names: group.names })), expected.map(group => ({ title: group.title, names: group.organizations.map(organization => organization.name) })));
    assert.equal(actual.logos, 12);
    assert.ok(actual.groups.every(group => group.contained && group.beforeSources) && !actual.overflow, JSON.stringify({ width, ...actual }));
    console.log(`Verified organizations at ${width}px: 3 co-initiators, 9 supporters, 12 loaded logos, full names, no overflow, and both groups above sources.`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
