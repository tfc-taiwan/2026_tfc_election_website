import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Normal releases update an existing Worker version without editing domain routes.
// Refuse to publish if that existing official entry point cannot be confirmed.
const local = JSON.parse(await readFile('data/listings.json', 'utf8'));
const response = await fetch('https://tfc-taiwan.org.tw/election2026/data/listings.json', { signal: AbortSignal.timeout(30000), cache: 'no-store' });
assert.equal(response.status, 200, 'The existing official election route must respond before publishing');
assert.ok(response.headers.get('content-type')?.includes('application/json'), 'The official route is not serving election site JSON');
const remote = await response.json();
assert.equal(remote.version, local.version);
assert.equal(remote.site?.name, local.site.name);
assert.ok(Array.isArray(remote.stories) && remote.stories.length > 0);
console.log('Confirmed the existing official election route. Publishing will update only its Worker version.');
