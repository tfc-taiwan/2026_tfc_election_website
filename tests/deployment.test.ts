import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('preview and production deployments cannot target the same Worker or domain routes', () => {
  const production = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  const preview = JSON.parse(readFileSync('wrangler.preview.jsonc', 'utf8'));
  assert.notEqual(production.name, preview.name);
  assert.equal(production.workers_dev, false);
  assert.equal(preview.workers_dev, true);
  assert.deepEqual(preview.routes, []);
  assert.deepEqual(production.routes.map((route: { pattern: string }) => route.pattern), ['tfc-taiwan.org.tw/election2026', 'tfc-taiwan.org.tw/election2026/*']);
  assert.equal(preview.vars.DEPLOYMENT_ENV, 'preview');
  assert.equal(production.vars.DEPLOYMENT_ENV, 'production');
  const previewWorkflow = readFileSync('.github/workflows/deploy-worker.yml', 'utf8');
  const productionWorkflow = readFileSync('.github/workflows/deploy-election2026-production.yml', 'utf8');
  assert.ok(previewWorkflow.includes('run: npm run build:worker:preview'));
  assert.ok(productionWorkflow.includes('run: npm run build:worker:production'));
  assert.ok(previewWorkflow.includes(`https://${preview.name}.tfc-taiwan-org.workers.dev preview`));
});
