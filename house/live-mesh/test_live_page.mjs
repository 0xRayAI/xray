// Tests for docs-site/static/live/live.js (the public live page's feed logic).
// Run: node --test house/live-mesh/test_live_page.mjs   (Node 18+, no deps)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

test('seat images map to bots/<seat>.png, rails get none, badges are one letter', () => {
  for (const k of L.SEAT_NAMES) assert.equal(L.botImage(k), `bots/${k}.png`);
  for (const k of ['GitHub', 'X', 'mymuse.house', 'constructor', 'stranger']) assert.equal(L.botImage(k), null);
  assert.equal(L.badgeLetter('mill'), 'M');
  assert.equal(L.badgeLetter('critic'), 'C');
  assert.equal(L.badgeLetter('mymuse.house'), 'M');
  const bots = path.join(liveDir, 'bots');
  for (const f of readdirSync(bots)) {
    assert.ok(L.SEAT_NAMES.includes(f.replace(/\.png$/, '')) && f.endsWith('.png'), `${f} is named for a seat`);
    assert.ok(statSync(path.join(bots, f)).size < 20000, `${f} stays small`);
  }
});

test('reduced motion turns off bob, pulse and the entry ease', () => {
  assert.deepEqual([...L.bob('forge', 12345, true)], [0, 0]);
  assert.equal(L.pulse(L.PULSE_MS / 2, true), 0);
  assert.equal(L.entry(0, 3, true), 1);
  const [dx, dy] = L.bob('forge', 12345, false);
  assert.ok(Math.abs(dx) <= 1.5 && Math.abs(dy) <= 3, 'bob stays within a few px');
  assert.notDeepEqual([...L.bob('forge', 12345, false)], [...L.bob('critic', 12345, false)], 'own phase per seat');
  assert.ok(Math.abs(L.pulse(L.PULSE_MS / 2, false) - 1) < 1e-9);
  assert.equal(L.pulse(L.PULSE_MS + 1, false), 0);
  assert.equal(L.entry(0, 0, false), 0);
  assert.equal(L.entry(L.ENTRY_MS + 9 * 90, 9, false), 1, 'mesh fully in within ~1.5 s (+ stagger)');
});

test('wordmark cells decode to the recipe grid; no stamp PNG on the page', () => {
  const cells = L.markCells();
  assert.equal(cells.length, L.MARK.h);
  assert.ok(cells.every((r) => r.length === L.MARK.w));
  const flat = cells.flat();
  assert.ok(flat.includes(1) && flat.includes(2), 'stencil white and orange both present');
  const html = readFileSync(path.join(liveDir, 'index.html'), 'utf8');
  assert.ok(!/stamp[-\w]*\.(png|jpe?g)|<img/i.test(html + readFileSync(path.join(liveDir, 'live.js'), 'utf8')));
  assert.match(html, /prefers-reduced-motion: reduce/);
});

test('prototype names in the feed never reach Object.prototype', () => {
  const e = { kind: 'comment', from: 'constructor', to: '__proto__' };
  assert.deepEqual([...L.resolveNodes(e)], ['GitHub', 'forge']);
  assert.deepEqual([...L.eventColor(e)], [180, 190, 210]);
  assert.equal(L.whoTag(e), 'CONSTRUC');
  const hot = L.hotNodes([{ src: 'GitHub', dst: 'forge', e }]);
  assert.deepEqual(Object.keys(hot).sort(), ['GitHub', 'forge']);
});

test('transport: Live shows as playing; a slider pick plays from there', () => {
  assert.equal(L.isPlaying(true, false), true, 'Live = playing, before and after new events');
  assert.equal(L.isPlaying(false, true), true);
  assert.equal(L.isPlaying(false, false), false, 'paused only when rewound and stopped');
  const b = [1000e3, 2000e3];
  assert.equal(L.sliderAction(1500e3, b), 'play');
  assert.equal(L.sliderAction(b[0], b), 'play');
  assert.equal(L.sliderAction(b[1], b), 'live');
  const html = readFileSync(path.join(liveDir, 'index.html'), 'utf8');
  assert.match(html, /sliderAction\(v, b\) === 'live'\) goLive\(\); else \{ rewindTo\(v\); playing = true; \}/);
  assert.match(html, /L\.isPlaying\(state\.live, playing\) \? '&#10074;&#10074; Pause'/);
});

test('quiet edges are still: dots only ride an edge with a ping in flight', () => {
  assert.equal(L.edgeTraffic(false), null);
  assert.ok(L.edgeTraffic(true).count > 0);
  assert.equal(L.orbitStep(16, [], false), 0, 'hub orbit still on a quiet feed');
  assert.equal(L.orbitStep(16, [{}], true), 0, 'and under reduced motion');
  assert.ok(L.orbitStep(16, [{}], false) > 0);
  const ev = L.mergeEvents([], feed.events);
  const quiet = L.pingsAt(ev, ev.at(-1)._t + 60e3, 1100);
  assert.equal(quiet.length, 0, 'an hour-old feed has nothing in the recent window');
  const html = readFileSync(path.join(liveDir, 'index.html'), 'utf8');
  assert.match(html, /var tr = L\.edgeTraffic\(burst\);\s+if \(!tr\) return;/);
});

test('seat status follows the dots: LIVE in flight and one window after landing, rewound and now', () => {
  const ev = L.mergeEvents([], [{ id: 'a', t_ct: '2026-10-06T03:00:00-05:00', kind: 'merged', from: 'forge', to: 'GitHub' }]);
  const t = ev[0]._t, span = 1100 * 600;
  const at = (x) => L.activeSeats(L.recentItems(ev, x, 2 * span), x, span, false);
  // rewound view (feed clock)
  assert.equal(at(t - 1).forge, undefined, 'not before the event');
  assert.equal(at(t + span / 2).forge, 1, 'dot in flight');
  assert.equal(at(t + span * 1.5).forge, 1, 'landed, window not passed');
  assert.equal(at(t + span * 2).forge, undefined, 'idle after the window');
  // now (wall clock flashes, staggered)
  const fl = [{ e: ev[0], start: 10_000 }];
  assert.equal(L.activeSeats(fl, 9_000, 1600, true).forge, 1, 'queued flash already counts');
  assert.equal(L.activeSeats(fl, 10_800, 1600, true).forge, 1);
  assert.equal(L.activeSeats(fl, 12_000, 1600, true).forge, 1, 'landed, window not passed');
  assert.equal(L.activeSeats(fl, 13_200, 1600, true).forge, undefined);
  assert.equal(L.activeSeats(fl, 10_800, 1600, true).GitHub, 1, 'both ends of the dot');
  const html = readFileSync(path.join(liveDir, 'index.html'), 'utf8');
  assert.match(html, /var hot = state\.live \? L\.activeSeats\(flashes/);
  assert.match(html, /nowWall - f\.start < 2 \* FLASH_MS/);
});
