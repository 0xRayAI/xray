// Tests for docs-site/static/live/live.js (the public live page's feed logic).
// Run: node --test house/live-mesh/test_live_page.mjs   (Node 18+, no deps)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const liveDir = path.join(here, '..', '..', 'docs-site', 'static', 'live');
const sandbox = {};
vm.runInNewContext(readFileSync(path.join(liveDir, 'live.js'), 'utf8'), sandbox);
const L = sandbox.LiveMesh;
const feed = JSON.parse(readFileSync(path.join(here, 'sample', 'live-events.json'), 'utf8'));
const schema = JSON.parse(readFileSync(path.join(here, 'schema.json'), 'utf8'));
const ids = (list) => list.map((e) => e.id);

test('merge sorts by time, dedupes by id, keeps every sample event', () => {
  const merged = L.mergeEvents([], feed.events);
  assert.equal(merged.length, new Set(ids(feed.events)).size);
  for (let i = 1; i < merged.length; i++) assert.ok(merged[i - 1]._t <= merged[i]._t);
  assert.deepEqual(ids(L.mergeEvents(merged, feed.events)), ids(merged), 'merging the same feed twice adds nothing');
  const shuffled = [...feed.events].reverse();
  assert.deepEqual(ids(L.mergeEvents([], shuffled)), ids(merged), 'input order does not matter');
});

test('a later poll adds only new ids and a re-sent id replaces the old copy', () => {
  const half = Math.floor(feed.events.length / 2);
  const known = L.mergeEvents([], feed.events.slice(0, half + 5));
  const relabeled = { ...feed.events[0], label: 'relabeled' };
  const merged = L.mergeEvents(known, [...feed.events.slice(half), relabeled]);
  assert.equal(merged.length, feed.events.length);
  assert.equal(merged.find((e) => e.id === relabeled.id).label, 'relabeled');
  assert.ok(!('_t' in feed.events[0]), 'inputs are not mutated');
});

test('replay shows exactly the events up to the chosen time', () => {
  const ev = L.mergeEvents([], feed.events);
  assert.equal(L.countUpTo(ev, ev[0]._t - 1), 0);
  assert.equal(L.countUpTo(ev, ev.at(-1)._t), ev.length);
  const k = Math.floor(ev.length / 3);
  const upTo = L.eventsUpTo(ev, ev[k]._t);
  assert.ok(upTo.length >= k + 1, 'the event at the chosen time is included');
  assert.ok(upTo.every((e) => e._t <= ev[k]._t));
  assert.ok(ev.slice(upTo.length).every((e) => e._t > ev[k]._t), 'nothing after the chosen time');
});

test('pings in flight are the events inside the ping span', () => {
  const ev = L.mergeEvents([], feed.events);
  const last = ev.at(-1);
  const pings = L.pingsAt(ev, last._t + 500, 1100);
  assert.ok(pings.some((p) => p.e.id === last.id));
  const p = pings.find((x) => x.e.id === last.id);
  assert.ok(Math.abs(p.p - 500 / 1100) < 1e-9);
  assert.equal(L.pingsAt(ev, last._t + 5000, 1100).length, 0);
});

test('applyFeed: Live follows now, a rewound view stays put', () => {
  const half = Math.floor(feed.events.length / 2);
  const start = { events: L.mergeEvents([], feed.events.slice(0, half)), live: true, t: 0, generatedAt: null };
  const now = Date.parse('2026-10-06T03:00:00-05:00');
  const live = L.applyFeed(start, feed, now);
  assert.equal(live.state.live, true);
  assert.equal(live.state.t, now);
  assert.equal(live.added.length, feed.events.length - half);
  assert.equal(live.state.generatedAt, Date.parse(feed.generated_at));
  const rewound = L.applyFeed({ ...start, live: false, t: 12345 }, feed, now);
  assert.equal(rewound.state.live, false);
  assert.equal(rewound.state.t, 12345);
  const older = L.applyFeed(live.state, { ...feed, generated_at: '2020-01-01T00:00:00-06:00', events: [] }, now);
  assert.equal(older.state.generatedAt, live.state.generatedAt, 'an older fallback copy never moves "updated" backwards');
  assert.equal(older.added.length, 0);
});

test('ping mapping matches render_mesh.resolve_nodes', () => {
  const r = (e) => [...L.resolveNodes(e)];
  assert.deepEqual(r({ kind: 'x_in_mention', from: 'someone', to: 'herald' }), ['X', 'herald']);
  assert.deepEqual(r({ kind: 'x_reply', from: 'herald', to: 'X' }), ['herald', 'X']);
  assert.deepEqual(r({ kind: 'deploy', from: 'GitHub', to: 'x' }), ['GitHub', 'mymuse.house']);
  assert.deepEqual(r({ kind: 'probe', from: 'x', to: 'y' }), ['mymuse.house', 'blinky']);
  assert.deepEqual(r({ kind: 'critic_pass', from: 'mill', to: 'critic' }), ['critic', 'GitHub']);
  assert.deepEqual(r({ kind: 'ci_pass', from: 'forge', to: 'forge' }), ['GitHub', 'forge']);
  assert.deepEqual(r({ kind: 'merged', from: 'Blaze0x1', to: 'GitHub' }), ['GitHub', 'forge']);
  assert.deepEqual(r({ kind: 'review', from: 'stranger', to: 'nobody' }), ['GitHub', 'forge']);
  for (const e of feed.events) {
    const [s, d] = L.resolveNodes(e);
    assert.ok(L.SATS[s] && L.SATS[d] && s !== d, `${e.id} maps to two drawn nodes`);
  }
  const legacy = new Set(['fix', 'probe', 'x_root', 'x_reply']);  // render_mesh falls back to the raw kind
  for (const k of schema.$defs.kind.enum) if (!legacy.has(k)) assert.ok(L.KIND_WORD[k], `kind word for ${k}`);
});

test('labels, CT times and fetch fallback', async () => {
  assert.equal(L.cleanLabel('a Dist b'), 'a \u2026 b');
  assert.equal(L.fmtCt(Date.parse('2026-10-06T02:13:17-05:00')), 'Oct 6 02:13:17 CT');
  assert.equal(L.ago(90e3), '2 min ago');
  assert.equal(L.headline({ repo: '0xRayAI/xray', number: 227, kind: 'merged' }), 'xray #227 \u00b7 merge');

  const calls = [];
  const res = (status, body, headers = {}) => ({
    status, ok: status >= 200 && status < 300, json: async () => body,
    headers: { get: (h) => headers[h] ?? null },
  });
  const now = 1_000_000_000_000;
  const mem = {};
  let script = [res(200, feed, { ETag: '"abc"' })];
  const fake = async (url, opts) => { calls.push({ url, opts }); return script.shift(); };
  let r = await L.fetchFeed(fake, now, mem);
  assert.equal(r.source, 'GitHub API');
  assert.ok(calls[0].url.startsWith('https://api.github.com/repos/0xRayAI/xray/contents/') && calls[0].url.includes('ref=live-wire'));
  assert.equal(calls[0].opts.headers.Accept, 'application/vnd.github.raw');
  assert.equal(mem.etag, '"abc"');

  script = [res(304, null)];
  r = await L.fetchFeed(fake, now, mem);
  assert.equal(r.feed, null, '304 means nothing new');
  assert.equal(calls[1].opts.headers['If-None-Match'], '"abc"');

  script = [res(403, {}, { 'X-RateLimit-Reset': String(now / 1000 + 900) }), res(200, feed)];
  r = await L.fetchFeed(fake, now, mem);
  assert.match(calls[3].url, /^https:\/\/raw\.githubusercontent\.com\/.*\?t=\d+$/);
  assert.equal(mem.apiBlockedUntil, now + 900e3);
  script = [res(500, {}), res(200, feed)];
  r = await L.fetchFeed(fake, now + 1000, mem);
  assert.equal(r.source, 'Pages copy', 'skips the API while rate-limited, then raw, then same-origin');
  assert.match(calls.at(-1).url, /^live-events\.json\?t=\d+$/);
});

test('page has no external scripts and no longer depends on the mp4', () => {
  const html = readFileSync(path.join(liveDir, 'index.html'), 'utf8');
  assert.ok(!/mesh-live\.mp4|<video/i.test(html));
  assert.ok(!/<(script|link)[^>]+(src|href)="(https?:)?\/\//i.test(html));
  assert.match(html, /<script src="live\.js"><\/script>/);
});
