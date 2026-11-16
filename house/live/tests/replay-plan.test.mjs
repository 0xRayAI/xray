import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWhen, replaySpeed } from '../tools/replay-plan.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('a Chicago wall time without an offset is November standard time', () => {
  const from = parseWhen('2026-11-16T03:00', 0);
  assert.equal(new Date(from).toISOString(), '2026-11-16T09:00:00.000Z');
  assert.equal(parseWhen('now', 1234), 1234);
});

test('speed fits the span into 15 to 30 seconds', () => {
  const from = parseWhen('2026-11-16T03:00');
  const to = from + 20 * 60 * 1000;
  const plan = replaySpeed(from, to, 20);
  assert.equal(plan.secs, 20);
  assert.equal(plan.speed, 60);
  assert.throws(() => replaySpeed(from, to, 10), /15 to 30/);
  assert.throws(() => replaySpeed(to, from, 20), /before/);
});

test('a morning window fills the requested 30 seconds', () => {
  const to = Date.parse('2026-11-16T10:30:00Z');
  const from = parseWhen('2026-11-16T03:00', to);
  const plan = replaySpeed(from, to, 30);
  assert.equal(Math.round(plan.spanMs / plan.speed / 1000), 30);
  assert.ok(plan.speed > 1 && plan.speed < 600);
});

test('the recorder defaults to dark and drives the speed control', () => {
  const src = fs.readFileSync(path.join(root, 'tools/record-board-replay.mjs'), 'utf8');
  assert.match(src, /colorScheme: theme/);
  assert.match(src, /bifrost-theme/);
  assert.match(src, /data-theme/);
  assert.match(src, /getElementById\('speed'\)/);
  assert.match(src, /--theme/);
  assert.match(src, /-ss/);
  assert.doesNotMatch(src, /window\.speed/);
});

test('rewind does not rebuild the seat nodes', () => {
  const html = fs.readFileSync(path.join(root, 'app/public/index.html'), 'utf8');
  const site = fs.readFileSync(path.join(root, 'site/public/site-config.js'), 'utf8');
  const rewind = html.slice(html.indexOf('function rewindTo'), html.indexOf('function rewindTo') + 180);
  assert.match(html, /<h1>🌈 Live board<\/h1>/);
  assert.match(html, /Object\.keys\(L\.SATS\)\.forEach/);
  assert.doesNotMatch(rewind, /SATS/);
  for (const seat of ['mill', 'nibbler', 'near']) assert.match(site, new RegExp(`${seat}:`));
});
