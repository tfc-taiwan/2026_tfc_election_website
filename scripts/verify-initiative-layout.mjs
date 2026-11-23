import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const expected = JSON.parse(await readFile('data/listings.json', 'utf8')).sections.initiative.content;
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Layout server startup timed out')), 15000);
    server.once('error', reject);
    server.stdout.on('data', data => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const executablePath = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  for (const width of [320, 390, 834, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const paper = document.querySelector('#initiative .pledge-paper');
      const note = paper.querySelector('.pledge-principles-note');
      const secondGroup = paper.querySelector('.pledge-group-1');
      const bounds = note.getBoundingClientRect(), container = paper.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(note);
      const noteLines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      const leftColumn = document.querySelector('#initiative .pledge-intro').getBoundingClientRect();
      const rightColumn = paper.getBoundingClientRect();
      const lead = document.querySelector('#initiative .pledge-description-embedded');
      const leadLines = new Set([...(() => { const r = document.createRange(); r.selectNodeContents(lead); return r.getClientRects(); })()].map(rect => Math.round(rect.top))).size;
      return { text: note.textContent, fontSize: getComputedStyle(note).fontSize, noteLines, leadWhiteSpace: getComputedStyle(lead.querySelector('p')).whiteSpace, leadLines, columnsEqual: Math.abs(leftColumn.height - rightColumn.height) < 1, below: bounds.top >= secondGroup.getBoundingClientRect().bottom, contained: bounds.left >= container.left && bounds.right <= container.right + 1, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(result.text, expected.principlesNote);
    const desktop = width >= 1181;
    assert.ok(result.fontSize === (desktop ? '12.5px' : '14px') && result.below && result.contained && !result.overflow, JSON.stringify({ width, ...result }));
    if (desktop) assert.ok(result.leadWhiteSpace === 'nowrap' && result.leadLines === 1 && result.noteLines === 2 && result.columnsEqual, JSON.stringify({ width, ...result }));
    console.log(`Verified initiative at ${width}px: text contained, columns aligned, and desktop copy uses the requested compact layout.`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
