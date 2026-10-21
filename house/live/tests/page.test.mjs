// Generated page (app/public/index.html): inline script compiles; Replay + ping-node guard are wired in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const html = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

test('inline scripts compile', () => { for (const s of inline) assert.doesNotThrow(() => new Function(s)); });
test('Replay: live on first load, ends into live, indicator', () => {
  assert.match(html, /REPLAY_MS = 25000, REPLAY_WINDOW_MS = 5 \* 60 \* 1000, REPLAY_MIN_EVENTS = 20, REPLAY_MAX_SPEED = 4/);
  assert.match(html, /L\.replayClock\(state\.events, Date\.now\(\)/);
  assert.match(html, /if \(first && !reduced && startReplay\(\)\) fresh = \[\];/);
  assert.match(html, /\(replay && state\.t >= replay\.end\)\) goLive\(\);/);
  assert.match(html, /function goLive\(\) \{ endReplay\(\);/);
  assert.match(html, /\$\('pill'\)\.hidden = spectrumUp && \(playing \|\| replay\);/);
});
test('pings never target an undrawn node (upstream lowercase reviewer)', () => {
  assert.match(html, /return fixPings\(L\.pingsAt\(/);
  assert.match(html, /return fixPings\(flashes\.filter/);
  assert.match(html, /function hopPing\(pk\)/);
});
test('branding: Lead is labeled Lead / Architect; banned role word absent', () => {
  const cfg = fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8');
  const banned = new RegExp(['f', 'o', 'u', 'n', 'd', 'e', 'r'].join(''), 'i');   // spelled out nowhere in the repo
  assert.doesNotMatch(cfg, banned);
  assert.doesNotMatch(html, banned);
  assert.match(cfg, /Lead: 'Lead', X: 'Others'/);
  assert.match(cfg, /Lead: 'Architect', X: 'other actors'/);
});
test('draw-loop guards: missing endpoints skipped + logged once; frame errors never stop the loop', () => {
  assert.match(html, /if \(!hasPos\(ed\[0\], 'edge'\) \|\| !hasPos\(ed\[1\], 'edge'\)\) return;/);
  assert.match(html, /if \(!hasPos\(pk\.src, 'ping'\) \|\| !hasPos\(pk\.dst, 'ping'\)\) return;/);
  assert.match(html, /catch \(err\) \{ warnOnce\('frame:'/);
});
test('board: every feed name maps to a drawn node; instances -> Example, QaOne/QaTwo -> QA; 7 seats', () => {
  const L = { SOURCES: [], AGENTS: [], SEAT_NAMES: [], SATS: {}, COLOR: {}, LABEL: {}, SUB: {}, GLYPH: {}, SQUARE: {},
    EDGES: [], BOT_IMAGES: [], KIND_WORD: {}, applyFeed: (st, feed) => ({ state: { events: feed.events } }) };
  new Function('window', 'location', fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8'))(
    { LiveMesh: L }, { search: '' });
  assert.deepEqual(L.SEAT_NAMES, ['Builder', 'Builder-cloud', 'Reviewer', 'Tester', 'QA', 'Operator', 'blinky']);
  for (const k of ['dev.example.com', 'labtest', 'app.example.com', 'QaOne', 'QaTwo', 'lead-alt', 'forge', 'CI']) assert.ok(!(k in L.SATS), k);
  assert.equal(Object.keys(L.SATS).length, 14);   // + Builder-cloud
  assert.equal(L.LABEL['Builder-cloud'], 'Builder-cloud'); assert.ok(L.EDGES.some(e => e[0] === 'Builder-cloud' && e[1] === 'GitHub'));
  assert.equal(L.LABEL.Assistant, 'Assistant / emitter'); assert.ok(L.AGENTS.some((a) => a[0] === 'Assistant')); assert.ok(!L.SEAT_NAMES.includes('Assistant'));   // emitter node, not a counted bot
  assert.equal(L.LABEL.CloudAgents, 'Cloud agents'); assert.equal(L.botImage('CloudAgents'), null);   // 'C' glyph, no image
  assert.ok(L.AGENTS.some((a) => a[0] === 'CloudAgents' && a[1] === 'cloud agents'));                 // header seat
  assert.ok(!L.SEAT_NAMES.includes('CloudAgents'));                                                     // not counted
  assert.equal(L.liveNodeKey('cursoragent', null), 'CloudAgents'); assert.equal(L.liveNodeKey('Cloud agents', null), 'CloudAgents');
  assert.equal(L.liveNodeKey('CI', null), 'GitHub'); assert.equal(L.liveNodeKey('forge', null), 'GitHub');
  assert.deepEqual(L.liveColor({ kind: 'check_run', conclusion: 'success' }), [90, 220, 120]);
  assert.deepEqual(L.liveColor({ kind: 'workflow_run', conclusion: 'failure' }), [240, 90, 80]);
  assert.deepEqual(L.liveColor({ kind: 'commit_status', state: 'pending' }), [165, 175, 190]);
  assert.equal(L.liveColor({ kind: 'merged' }), null);

  assert.equal(L.LABEL.Lead, 'Lead'); assert.equal(L.SUB.Lead, 'Architect'); assert.equal(L.botImage('Lead'), null);   // kit ships no avatar files, maps none
  assert.equal(L.LABEL['mymuse.house'], 'Product'); assert.equal(L.LABEL.QA, 'QA');
  for (const ed of L.EDGES) assert.ok(ed[0] in L.SATS && ed[1] in L.SATS, ed.join('-'));
  const names = ['Builder', 'Reviewer', 'reviewer', 'Tester', 'QaOne', 'QaTwo', 'QA', 'Operator', 'Coord', 'CI', 'Others',
    'GitHub', 'Railway', 'Example', 'lead-alt', 'Lead', 'dev.example.com', 'app.example.com', 'labtest', 'mystery',
    'lead-alt', 'lead-login'];
  const ev = names.map((n, i) => ({ id: 'e' + i, t_ct: '2026-10-08T13:00:00-05:00', kind: 'x', from: n, to: n, hops: [n, 'dev.example.com'] }));
  ev.push({ id: 'h', t_ct: '2026-10-08T13:00:00-05:00', kind: 'health_ok', from: 'app.example.com', to: 'Example' });
  const out = L.applyFeed({ events: [] }, { product_nodes: ['Example', 'dev.example.com', 'app.example.com', 'labtest'], events: ev }).state.events;   // header from a template collector
  for (const e of out) {
    assert.ok(e.from in L.SATS && e.to in L.SATS, e.id + ' ' + e.from + '->' + e.to);
    if (e.hops) assert.ok(e.hops.every((k) => k in L.SATS), e.id);
  }
  assert.deepEqual([out.at(-1).from, out.at(-1).to], ['Railway', 'mymuse.house']);
  assert.equal(out.find((e) => e.id === 'e4').to, 'QA');
  for (const i of [14, 20, 21]) assert.equal(out.find((e) => e.id === 'e' + i).from, 'Lead', names[i]);   // lead-alt / lead-alt / lead-login
  const more = [['op_deploy', 'Operator', 'dev.example.com', ['Operator', 'Railway', 'Example'], ['Operator', 'Railway', 'mymuse.house']],
    ['op_commit', 'Operator', 'GitHub', ['Operator', 'GitHub'], ['Operator', 'GitHub']],
    ['cos_file', 'Coord', 'Example', ['Coord', 'Example'], ['blinky', 'mymuse.house']],
    ['check_run', 'GitHub', 'Builder', ['GitHub', 'Builder'], ['GitHub', 'Builder']],
    ['check_suite', 'GitHub', 'GitHub', ['GitHub'], null],
    ['cloud_reply', 'Operator', 'CloudAgents', ['Operator', 'CloudAgents'], ['Operator', 'CloudAgents']],
    ['cloud_finished', 'CloudAgents', 'Operator', ['CloudAgents', 'Operator'], ['CloudAgents', 'Operator']]];
  const o2 = L.applyFeed({ events: [] }, { product_nodes: ['Example', 'dev.example.com', 'app.example.com', 'labtest'], events: more.map((m, i) => ({ id: 'm' + i, t_ct: '2026-10-08T13:00:00-05:00', kind: m[0], from: m[1], to: m[2], hops: m[3] })) }).state.events;
  more.forEach((m, i) => assert.deepEqual(o2[i].hops, m[4], m[0]));
  assert.deepEqual([o2[4].from, o2[4].to], ['GitHub', 'GitHub']);   // one-node check: drawn as a ring on GitHub
});
test('live queue: every new id flashes once in time order, late ones tagged, none capped or lost while not live', () => {
  assert.doesNotMatch(html, /slice\(-12\)/);
  const a = html.indexOf('  // Live queue:'), b = html.indexOf('  function currentPings(nowWall) {', a);
  assert.ok(a > 0 && b > a);
  const now = Date.now(), ev = (id, ageS) => ({ id, _t: now - ageS * 1000, hops: ['Builder', 'GitHub', 'Railway', 'dev.example.com'] });
  const run = new Function('window', 'state', 'flashes', 'STAGGER_MS', 'FLASH_MS', 'performance',
    html.slice(a, b) + '\nreturn { queueFresh, playFresh };');
  const win = {}, state = { live: false }, flashes = [];
  const q = run(win, state, flashes, 450, 1600, { now: () => 0 });
  const batch = Array.from({ length: 34 }, (_, i) => ev('e' + i, 200 - i));   // 34 new ids, oldest first
  batch.push(ev('m187', 400), ev('old', 3600));                               // a late merge + a 1 h old import
  q.queueFresh(batch); q.playFresh();
  assert.equal(flashes.length, 0, 'nothing plays while Replay / rewound');
  state.live = true; q.playFresh();
  assert.equal(flashes.length, 35, 'all 35 recent ids play (no newest-12 cap)');
  assert.equal(flashes[0].e.id, 'm187');
  assert.ok(flashes[0].late && flashes[0].dur === 4800);
  assert.ok(flashes.every((f, i) => !i || f.start > flashes[i - 1].start));
  assert.ok(flashes[34].start <= 9000, 'big batch compresses into ~9 s');
  assert.deepEqual(win.LIVE_LIVE_STATS, { queued: 36, played: 35, late: 35, history: 1 });
  q.queueFresh([ev('n1', 5)]); q.playFresh();
  assert.ok(!flashes[35].late && flashes[35].start > flashes[34].start, 'next batch queues after, not on top');
});
test('one-node events draw a ring pulse instead of a self-edge; check colors applied to pings', () => {
  assert.match(html, /if \(pk\.src === pk\.dst\) \{   \/\/ one-node event/);
  assert.match(html, /var uc = L\.liveColor && L\.liveColor\(pk\.e\); if \(uc\) pk\.col = uc;/);
  assert.doesNotMatch(html, /'GitHub' : 'forge'/);
});
test('Cloud agents seat reads the feed cloud state, not the bot count', () => {
  assert.match(html, /if \(k === 'CloudAgents'\) return !!\(f && f\.cloud && f\.cloud\.active\);/);
});

test('LIVE pill is honest about generated_at age', () => {
  assert.match(html, /behind ' \+ m \+ ' min/);
  assert.match(html, /\.pill\.behind/);
  assert.match(html, /\(now - state\.generatedAt\) > 90000/);
  assert.match(html, /if \(!state\.generatedAt\) return 'building'/);
});

test('wave header says building with no stamp and empty when the board has zero cards', () => {
  assert.match(html, /if \(!wb\.stamp\) waveHead\.textContent = 'building'/);
  assert.match(html, /else if \(!wb\.cards\.length && !cloudN\) waveHead\.textContent = 'empty'/);
  assert.match(html, /else if \(!wb\.cards\.length\) waveHead\.textContent = cloudN \+ ' cloud'/);
});



test('working: canvas label keeps the rolling sheen; header chip blinks its EXISTING dot in the seat color', () => {
  assert.match(html, /function fleetWorking\(k\)/);
  assert.match(html, /seat-color sheen sweeping/);                       // canvas, under the node icon
  assert.match(html, /s\.dot\.classList\.toggle\('blink', on\)/);
  assert.match(html, /if \(spinning\) s\.dot\.style\.background = rgb\(c\)/);
  assert.match(html, /\.seat \.dot\.blink \{ animation: live-blink/);
  assert.match(html, /prefers-reduced-motion: reduce\) \{ \.seat \.dot\.blink \{ animation: none/);
  assert.doesNotMatch(html, /s\.spin/);                                  // no extra element in the chip
  assert.doesNotMatch(html, /\.seat \.spin/);
  assert.doesNotMatch(html, /\u2699/);
});
test('one seat state: header text, dot and node label all come from L.seatView(seatState(..)) (working > live > active > idle)', () => {
  const L = { SOURCES: [], AGENTS: [], SEAT_NAMES: [], SATS: {}, COLOR: {}, LABEL: {}, SUB: {}, GLYPH: {}, SQUARE: {},
    EDGES: [], BOT_IMAGES: [], KIND_WORD: {}, applyFeed: (st, feed) => ({ state: { events: feed.events } }) };
  new Function('window', 'location', fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8'))({ LiveMesh: L }, { search: '' });
  const want = { working: ['WORKING', true, true, true], live: ['LIVE', true, false, false], active: ['ACTIVE', true, false, false], idle: ['IDLE', false, false, false] };
  for (const working of [false, true]) for (const live of [false, true]) for (const active of [false, true]) {
    const st = L.seatState(working, live, active);
    assert.equal(st, working ? 'working' : live ? 'live' : active ? 'active' : 'idle');
    const v = L.seatView(st), [word, lit, blink, nodeWorking] = want[st];
    assert.deepEqual([v.word, v.lit, v.blink, v.nodeWorking], [word, lit, blink, nodeWorking], `${working}/${live}/${active}`);
    assert.equal(v.blink, v.nodeWorking);                       // dot blinks <=> node shows 'working'
    assert.equal(v.word === 'IDLE', !v.lit);                    // header word idle <=> node unlit
  }
  // the page derives chip text, dot and node from that one state (no other source of truth left)
  assert.match(html, /function seatState\(k, hot\) \{ return L\.seatState\(fleetWorking\(k\), !!\(hot && hot\[k\]\), fleetActive\(k\)\); \}/);
  assert.match(html, /v = L\.seatView\(seatState\(a\[0\], hot\)\), on = v\.lit;/);
  assert.doesNotMatch(html, /s\.st/);
  assert.match(html, /var spinning = v\.blink;/);
  assert.match(html, /el\.querySelector\('\.role'\)\.textContent = String\(a\[1\] \|\| ''\)/);
  assert.doesNotMatch(html, /createElement\('button'\)[\s\S]{0,80}className = 'seat'/);
  assert.match(html, /var nv = L\.seatView\(seatState\(key, hot\)\); nodeView\[key\] = nv;/);
  assert.match(html, /drawNode\(key, nv\.lit, fs, pul, nv\.nodeWorking, nowWall\);/);
  assert.doesNotMatch(html, /hot\[a\[0\]\] \? 'LIVE'/);         // the old split derivation is gone
  assert.doesNotMatch(html, /fleetWorking\(key\), nowWall/);
});

test('near-real-time poll: config sets 10 s, page polls on L.POLL_MS after the overlay loads', async () => {
  const vm = await import('node:vm');
  const pub = path.join(APP, 'public');
  const ctx = { window: {}, console, URLSearchParams, location: { search: '', hash: '', href: 'http://x/' }, document: { addEventListener() {} } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live-config.js'), 'utf8'), ctx);
  assert.equal(ctx.LiveMesh.POLL_MS, 10000);
  assert.match(html, /setInterval\(poll, L\.POLL_MS\)/);
  assert.ok(html.indexOf('src="live-config.js"') < html.indexOf('setInterval(poll, L.POLL_MS)'));
});
test('delta polls: full once, then ?since=cursor; new ids play once; 304 = no feed; reset refetches full', async () => {
  const vm = await import('node:vm');
  const pub = path.join(APP, 'public');
  const ctx = { console, URLSearchParams, location: { search: '', hash: '', href: 'http://x/' }, document: { addEventListener() {} },
    LIVE_FEED_URL: '/live-events.json' };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live-config.js'), 'utf8'), ctx);
  const L = ctx.LiveMesh;
  const e = (id, extra = {}) => ({ id, t_ct: '2026-10-09T07:5' + id.slice(-1) + ':00-05:00', kind: 'commit', from: 'Builder', to: 'GitHub', ...extra });
  const replies = [], urls = [];
  const fake = (url) => { urls.push(url); const [status, body] = replies.shift();
    return Promise.resolve({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) }); };
  const mem = {};
  let state = { events: [], live: true, t: 0 };
  const step = async () => { const r = await L.fetchFeed(fake, Date.now(), mem); if (!r.feed) return null;
    const out = L.applyFeed(state, r.feed, Date.now()); state = out.state; return out.added; };
  replies.push([200, { cursor: 'E.1', generated_at: '2026-10-09T07:55:00-05:00', event_count: 2, fleet: { a: 1 }, events: [e('e1'), e('e2')] }]);
  assert.deepEqual([...await step()].sort(), ['e1', 'e2']);
  assert.equal(urls[0], '/live-events.json');
  replies.push([200, { delta: true, cursor: 'E.2', generated_at: '2026-10-09T07:56:00-05:00', event_count: 3, fleet: { a: 2 },
    events: [e('e2', { status: 'done' }), e('e3')], removed: [] }]);
  assert.deepEqual([...await step()], ['e3']);                         // the changed e2 does not replay
  assert.equal(urls[1], '/live-events.json?since=E.1');
  assert.equal(state.events.length, 3);
  assert.equal(state.events.find((x) => x.id === 'e2').status, 'done');
  assert.equal(state.generatedAt, Date.parse('2026-10-09T07:56:00-05:00'));
  assert.equal(ctx.LIVE_FLEET.a, 2);
  replies.push([304, null]);
  assert.equal(await step(), null);
  assert.equal(urls[2], '/live-events.json?since=E.2');
  replies.push([200, { reset: true, cursor: 'F.1' }], [200, { cursor: 'F.1', generated_at: '2026-10-09T07:57:00-05:00', events: [e('e1'), e('e4')] }]);
  assert.deepEqual([...await step()], ['e4']);                         // reset -> full refetch, only unseen ids play
  assert.deepEqual(urls.slice(3), ['/live-events.json?since=E.2', '/live-events.json']);
  assert.equal(mem.cursor, 'F.1');
});
test('ambient Replay loop: 20 s pass then a 30 s gap, visual only, pauses for a live packet', () => {
  assert.match(html, /AMBIENT_EVERY_MS = 50000, AMBIENT_MS = 20000, AMBIENT_WINDOW_MS = 5 \* 60 \* 1000, AMBIENT_ALPHA = 0\.4, AMBIENT_GAP_MS = 30000;/);
  assert.match(html, /function liveInFlight\(nowWall\)/);
  assert.match(html, /if \(liveInFlight\(nowWall\)\) \{ ambient = null; ambientNext = nowWall \+ AMBIENT_GAP_MS; return \[\]; \}/);
  assert.match(html, /var ambientOn = !reduced && !\/\[\?&\]replay=0\(&\|\$\)\/\.test\(location\.search\);/);
  assert.match(html, /<input id="ambient" type="checkbox" checked>/);
  assert.match(html, /if \(!ambientOn \|\| !state\.live \|\| replay \|\| document\.hidden\)/);
  // ghosts drawn dimmed first, live pings on top at full brightness
  assert.match(html, /ctx\.globalAlpha = AMBIENT_ALPHA; ghosts\.forEach\(drawPing\); ctx\.globalAlpha = 1; \}\n    pings\.forEach\(drawPing\);/);
  // visual only: the loop never touches live state / speed / replay, and makes no fetches
  const body = html.split('function ambientPings(nowWall) {')[1].split('function draw(')[0];
  assert.doesNotMatch(body, /state\.(live|t|generatedAt)\s*=|speed\s*=|replay\s*=|rewindTo|goLive|fetch|setInterval|setTimeout|flashes/);
});
test('Live board: rainbow trail only on replay pings, Spectrum pill, no replay chip', () => {
  assert.match(html, /<span class="pill" id="pill">LIVE<\/span><span class="spectrum-pill" id="spectrumPill" hidden>Spectrum<\/span>/);
  assert.doesNotMatch(html, /id="specTag"|class="spec-tag"/);
  assert.match(html, /if \(spectrumOn\) \{ ghosts\.forEach\(function \(g\) \{ g\.live = true; \}\); if \(replay \|\| playing\) pings\.forEach/);
  assert.match(html, /if \(pk\.live\) replayTrail\(a, m, b, p, nowWall\);\n      else for \(var k = 5;/);
  assert.doesNotMatch(html.split('function playFresh() {')[1].split('function currentPings')[0], /replayTrail/);
});
test('working-gone regression: Replay / ambient / Live board code never touches working state or seat chips', () => {
  const grab = (a, b) => html.split(a)[1].split(b)[0];
  const parts = [grab('function startReplay() {', '\n  }\n'), grab('function replayTrail(', 'function ambientPings'),
    grab('function ambientPings(nowWall) {', 'function draw('), grab('if (spectrumOn)', '    pings.forEach(drawPing);')];
  for (const p of parts) assert.doesNotMatch(p, /working|LIVE_FLEET|seatEls|seatState|chipView|nodeView|\.seat\b/);
  // seat state still derives from the fleet only (not the replay clock)
  assert.match(html, /function seatState\(k, hot\) \{ return L\.seatState\(fleetWorking\(k\), !!\(hot && hot\[k\]\), fleetActive\(k\)\); \}/);
});
test('board panel: split 2/3 + 1/3, model from feed.board, textContent only, glow on related beats, toggle', () => {
  assert.match(html, /grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
  assert.match(html, /<b>\u{1F30A} Board<\/b>/u);
  assert.match(html, /if \(r\.feed\.board && Array\.isArray\(r\.feed\.board\.cards\)\)/);
  assert.match(html, /\.wave\.collapsed \.wave-body \{ display: none; \}/);
  assert.match(html, /f\.landed = 1; waveGlow\(f\.e\);/);
  const js = html.split('// 🌊 Board panel')[1].split('function draw(')[0];
  assert.doesNotMatch(js, /innerHTML|fetch\(|setInterval|setTimeout/);
  assert.match(js, /wbSafeUrl/);
});
test('pre-alpha naming: page is 🌈 Live board, Spectrum pill, panel 🌊 Board', () => {
  assert.match(html, /<title>\u{1F308} Live board/u);
  assert.match(html, /<h1>\u{1F308} Live board<\/h1>/u);
  assert.match(html, /id="spectrumPill" hidden>Spectrum</);
  assert.doesNotMatch(html, /id="specTag"/);
  assert.match(html, /<b>\u{1F30A} Board<\/b>/u);
});
test('board stats strip: 24h counts + open now from feed.board.stats, textContent only', () => {
  assert.match(html, /<div class="wave-stats" id="waveStats"/);
  for (const k of ['issues_opened_24h', 'issues_closed_24h', 'prs_opened_24h', 'prs_merged_24h', 'prs_closed_unmerged_24h', 'owner_prompts_24h', 'owner_prompts_24h_ids', 'owner_prompts_24h_bytes', 'open_total']) assert.match(html, new RegExp('S\\.' + k));
  assert.match(html, /'owner prompts'/);
  assert.match(html, /wb\.stats = r\.feed\.board\.stats \|\| null/);
});
test('silent seat: amber "silent 2h" on node and chip from fleet.seats[name].silent, never while working', () => {
  assert.match(html, /return !!\(f && f\.seats && f\.seats\[name\] && f\.seats\[name\]\.silent\);/);
  assert.match(html, /var silentNow = !spinning && fleetSilent\(key\);/);
  assert.match(html, /ctx\.fillText\('silent 2h', x, top\)/);
  assert.match(html, /var sil = !v\.blink && fleetSilent\(a\[0\]\);/);
  assert.match(html, /if \(sil\) s\.dot\.style\.background = cssVar\('--silent-ink'\)/);
  assert.doesNotMatch(html, /textContent \+= ' · silent 2h'/);
});

// ---- lap2 UI review: helpers + our overlay ------------------------------------------------------------------------
function loadCfg(withSite) {
  const L = { SOURCES: [], AGENTS: [], SEAT_NAMES: [], SATS: {}, COLOR: {}, LABEL: {}, SUB: {}, GLYPH: {}, SQUARE: {},
    EDGES: [], BOT_IMAGES: [], KIND_WORD: {}, applyFeed: (st, feed) => ({ state: { events: feed.events } }) };
  new Function('window', 'location', fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8'))({ LiveMesh: L }, { search: '' });
  new Function('window', fs.readFileSync(path.join(APP, 'public', 'site-config.js'), 'utf8'))({ LiveMesh: L });
  if (withSite) new Function('window', fs.readFileSync(path.join(APP, '..', 'site', 'public', 'site-config.js'), 'utf8'))({ LiveMesh: L });
  return L;
}
test('our overlay does not install a fixed roster strip; the canvas still draws its nodes', () => {
  const L = loadCfg(true);
  assert.deepEqual(L.SEAT_NAMES, []);
  assert.deepEqual(L.AGENTS, []);
  for (const s of ['blinky', 'critic', 'forge']) assert.ok(s in L.SATS, s);
  assert.equal(L.SUB.arch1, 'outside party'); assert.equal(L.LABEL.arch1, 'Arch1'); assert.ok('arch1' in L.SATS);
  for (const parked of ['herald', 'magnet', 'nibbler', 'sound']) assert.ok(!(parked in L.SATS), parked);
  for (const k of ['Lead', 'X', 'Builder', 'Reviewer', 'Operator', 'Tester', 'QA']) assert.ok(!(k in L.SATS), k);
  assert.ok(!JSON.stringify([L.LABEL, L.SUB]).includes('Example'));
  for (const k of ['mymuse.house', 'burst-live', 'Bifrost']) assert.ok(!(k in L.SATS) && !(k in L.LABEL), k);  // the board is not a node
  assert.ok(!JSON.stringify(L.LABEL).includes('burst-live'));
  for (const e of L.EDGES) assert.ok(e[0] in L.SATS && e[1] in L.SATS, String(e));
  for (const k of L.BOT_IMAGES) assert.ok(fs.existsSync(path.join(APP, '..', 'site', 'public', L.botImage(k))), k);
  assert.equal(L.botImage('mill'), null);
  const ev = L.applyFeed({}, { events: [{ id: 1, t_ct: '2026-10-13T10:00:00-05:00', from: 'Blaze', to: 'GitHub' },
    { id: 2, t_ct: '2026-10-13T10:01:00-05:00', from: 'Others', to: 'Bifrost' }, { id: 3, t_ct: '2026-10-13T10:02:00-05:00', from: 'forge', to: 'GitHub' },
    { id: 4, t_ct: '2026-10-13T10:03:00-05:00', kind: 'seat_turn', from: 'forge', to: 'Bifrost', hops: ['forge', 'Bifrost'] },
    { id: 5, t_ct: '2026-10-13T10:04:00-05:00', kind: 'op_deploy', from: 'Operator', to: 'Bifrost', hops: ['Operator', 'Railway', 'Bifrost'] },
    { id: 6, t_ct: '2026-10-13T10:05:00-05:00', kind: 'merged', from: 'forge', to: 'Bifrost', repo: '0xRayAI/xray', number: 485, label: 'merged #485' }] }).state.events;
  assert.deepEqual(ev.map(e => [e.from, e.to, e.kind || '']), [['Blaze', 'GitHub', ''], ['forge', 'GitHub', ''], ['forge', 'forge', 'seat_turn'], ['GitHub', 'Railway', 'op_deploy'], ['forge', 'GitHub', 'merged']]);
  assert.ok(!ev[2].hops || ev[2].hops.length < 2);   // one hop is a self-pulse; the kit draws a ring
  assert.deepEqual(ev[3].hops, ['GitHub', 'Railway']);
  assert.ok('Blaze' in L.SATS); assert.equal(L.LABEL.Blaze, 'Blaze');
  assert.deepEqual(L.SATS.CloudAgents, [150, 330]);
  assert.equal(L.LABEL.CloudAgents, 'Cloud agents');
  assert.equal(L.SUB.CloudAgents, 'cursor agents');
  assert.deepEqual(L.COLOR.CloudAgents, [130, 190, 255]);
  assert.ok(L.EDGES.some((e) => e[0] === 'CloudAgents' && e[1] === 'GitHub'));
  for (const n of ['CloudAgents', 'Cloud agents', 'cursoragent']) assert.equal(L.liveNodeKey(n, null), 'CloudAgents', n);
  for (const n of ['Blaze', 'Blaze0x1', 'htafolla', 'Lead']) assert.equal(L.liveNodeKey(n, null), 'Blaze', n);
  assert.equal(L.botImage('arch1'), 'avatars/arch1.png');
  for (const x of Object.values(L.SATS)) assert.ok(x[0] >= 80 && x[0] <= 840, String(x));
  assert.match(L.SITE_FOOT, /Bifrost/);
});
test('rosterEntries reads the feed roster and its roles, and ignores a missing list', () => {
  const live = fs.readFileSync(path.join(APP, 'public', 'live.js'), 'utf8');
  const g = {};
  new Function('globalThis', live)(g);
  const entries = g.LiveMesh.rosterEntries({
    roster: ['alpha', 'beta', 'alpha', { name: 'gamma', role: 'gate' }],
    roster_roles: { beta: 'voice' },
  });
  assert.deepEqual(entries, [['alpha', ''], ['beta', 'voice'], ['gamma', 'gate']]);
  assert.equal(g.LiveMesh.rosterEntries({ seats: ['alpha', 'beta', 'gamma', 'delta'] }), null);
  assert.equal(g.LiveMesh.rosterEntries({}), null);
  assert.match(html, /L\.rosterEntries\(r\.feed\)/);
  assert.match(html, /margin-left: auto/);
  assert.match(html, /id="themeToggle"/);
  const title = html.slice(html.indexOf('<div class="title">'), html.indexOf('</div>', html.indexOf('<div class="title">')));
  assert.ok(title.indexOf('id="pill"') < title.indexOf('id="themeToggle"'));
});
test('kit without overlay: template roles kept, no avatars mapped (no 404s), empty footer', () => {
  const L = loadCfg(false);
  assert.deepEqual(L.SEAT_NAMES, ['Builder', 'Builder-cloud', 'Reviewer', 'Tester', 'QA', 'Operator', 'blinky']);
  assert.deepEqual(L.BOT_IMAGES, []); assert.equal(L.SITE_FOOT, '');
  assert.ok(!/<footer>Example<\/footer>/.test(html)); assert.match(html, /<script src="site-config.js"><\/script>/);
});
test('Lens label stays inside the canvas', () => {
  const L = loadCfg(false);
  assert.equal(L.labelX(860, 150, 920), 920 - 75 - 2); assert.equal(L.labelX(30, 100, 920), 52); assert.equal(L.labelX(400, 100, 920), 400);
  assert.match(html, /var lx = L\.labelX\(x, w, W\);/);
});
test('board manual uses beat and wave, never lap', () => {
  const doc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'board.md'), 'utf8');
  assert.match(doc, /## Page behaviour \(wave\)/);
  assert.match(doc, /Wave fix:/);
  assert.match(doc, /\*\*Beats\*\*/);
  assert.doesNotMatch(doc, /\blap\b/i);
});
test('header active count and chips read one source (seatState over L.SEAT_NAMES)', () => {
  assert.match(html, /var seatNames = L\.SEAT_NAMES;/);
  assert.match(html, /seatNames\.filter\(function \(k\) \{ return seatState\(k, hot\) !== 'idle'; \}\)/);
});
test('board: review cards also wait on the review seat; grouping by seat; board follows the timeline', () => {
  const L = loadCfg(true);
  const cards = [{ key: 'a', owner: 'forge', stage: 'review', state: 'live', beats: [{ t: 100 }, { t: 300 }] },
    { key: 'b', owner: 'critic', stage: 'done', state: 'closed', beats: [{ t: 50 }] },
    { key: 'c', owner: 'mill', stage: 'open', state: 'live', beats: [{ t: 500 }] }];
  const g = Object.fromEntries(L.boardGroups(cards, c => c.owner).map(x => [x.name, x.cards]));
  assert.deepEqual(g.critic.map(c => [c.key, c._bucket || L.cardBucket(c)]), [['a', 'waiting'], ['b', 'done']]);
  assert.deepEqual(g.forge.map(c => L.cardBucket(c)), ['review']);
  assert.deepEqual(L.boardAt(cards, 200).map(c => [c.key, c.beats.length]), [['a', 1], ['b', 1]]);
  assert.equal(L.boardAt(cards, null), cards);
  assert.match(html, /var cards = L\.boardAt\(wb\.allCards \|\| wb\.cards, asOf\);/);
});
test('packets: longer flight, halo + path so a hop is visible seat to seat', () => {
  assert.match(html, /var FLASH_MS = 2600/);
  assert.match(html, /arc\(q\[0\], q\[1\], 18, 0, 7\)/);
  assert.doesNotMatch(html, /id="specTag"/);
});

test('Play starts a replay; live is not playing, so the clock is not frozen at now', async () => {
  const vm = await import('node:vm');
  const pub = path.join(APP, 'public');
  const ctx = { console, URLSearchParams, location: { search: '', hash: '', href: 'http://x/' }, document: { addEventListener() {} } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live.js'), 'utf8'), ctx);
  const L = ctx.LiveMesh;
  assert.equal(L.isPlaying(true, false), false, 'live is real time, not a replay');
  assert.equal(L.isPlaying(false, true), true, 'a rewound replay is playing');
  assert.equal(L.isPlaying(true, true), false, 'live must not keep the replay button on Pause');
  assert.equal(L.isPlaying(false, false), false);
  assert.match(html, /if \(state\.live\) \{ if \(!reduced\) startReplay\(\); lastText = 0; return; \}/);
  assert.doesNotMatch(html, /rewindTo\(Date\.now\(\)\); playing = false/);
  assert.match(html, /if \(playing && \(replay \|\| !state\.live\)\)/);
  assert.match(html, /if \(replay\) state\.live = false;/);
  assert.match(html, /\(replay && state\.t >= replay\.end\)\) goLive\(\);/);
});

test('resume at the live edge rewinds before frame, so frame does not goLive()', async () => {
  const vm = await import('node:vm');
  const pub = path.join(APP, 'public');
  const script = inline.find((s) => s.includes('function frame(nowWall)'));
  const hooked = script.replace(
    'setInterval(poll, L.POLL_MS);\n  requestAnimationFrame(frame);',
    `__host.page = {
      frame: frame,
      clickPlay: function () { document.getElementById('play').dispatch('click'); },
      pauseAt: function (t, events, spd) { state.live = false; state.t = t; playing = false; replay = null; speed = spd || 600; reduced = false; state.events = events; },
      setReduced: function (on) { reduced = !!on; },
      snap: function () { return { live: state.live, t: state.t, playing: playing, replay: !!replay }; }
    };
    setInterval(poll, L.POLL_MS);
    requestAnimationFrame(frame);`,
  );
  const host = {};
  function el(id) {
    const listeners = {};
    const node = {
      id, style: {}, dataset: {}, textContent: '', innerHTML: '', hidden: false, checked: false, disabled: false,
      value: '600', title: '', clientWidth: 920, width: 920, height: 400,
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      appendChild(c) { return c; },
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      dispatch(type) { for (const fn of listeners[type] || []) fn({ type, target: { tagName: 'BUTTON' }, preventDefault() {} }); },
      getContext() { return new Proxy({}, { get: () => () => {} }); },
      getAttribute() { return null; }, setAttribute() {},
      closest() { return null; },
      querySelector() { return el('q'); },
      querySelectorAll() { return []; },
    };
    node.parentNode = { title: '', appendChild() {}, style: {}, classList: node.classList };
    return node;
  }
  const els = new Map();
  const document = {
    hidden: false,
    addEventListener() {},
    getElementById(id) { if (!els.has(id)) els.set(id, el(id)); return els.get(id); },
    createElement() { return el('x'); },
  };
  const ctx = {
    console, URL, URLSearchParams, Date, Math, Number, String, Object, Array, JSON, Promise, Error, parseInt,
    setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    performance: { now: () => Date.now() },
    requestAnimationFrame() {},
    devicePixelRatio: 1,
    fetch: () => new Promise(() => {}),
    document,
    location: { search: '', hash: '', href: 'http://x/' },
    Image: class { set src(_) {} },
    addEventListener() {},
    __host: host,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.matchMedia = () => ({ matches: false, addEventListener() {} });
  vm.createContext(ctx);
  for (const f of ['live.js', 'live-config.js', 'site-config.js']) {
    vm.runInContext(fs.readFileSync(path.join(pub, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(hooked, ctx, { filename: 'index-inline.js' });
  const page = host.page;
  const at = Date.now();
  page.pauseAt(at, [{ id: 'e1', _t: at - 60 * 1000, from: 'forge', to: 'GitHub', label: 'example-org/app#4 opened' }]);
  page.clickPlay();
  page.frame(at + 1000);
  const snap = page.snap();
  assert.equal(snap.live, false, 'a playhead parked at now must not snap back to live');
  assert.equal(snap.playing, true);
  assert.ok(snap.replay, 'resume within one capped frame of now starts a replay');
  assert.ok(snap.t < at, 'frame advanced the rewound playhead, it did not jump to now');

  const behind = at - 60 * 1000;
  const ev = [{ id: 'e1', _t: behind, from: 'forge', to: 'GitHub', label: 'example-org/app#4 opened' }];
  page.pauseAt(behind, ev, 600);
  page.clickPlay();
  const cont = page.snap();
  assert.equal(cont.playing, true, '60s behind at 600× continues');
  assert.equal(cont.replay, false, '60s behind does not start the canned replay');
  assert.equal(cont.t, behind);
  page.frame(at + 2000);
  const stepped = page.snap();
  assert.equal(stepped.live, false, 'one capped frame at 600× does not go live from 60s behind');
  assert.equal(stepped.playing, true);
  assert.equal(stepped.replay, false);
  assert.ok(stepped.t > behind, 'the frame advances the playhead');
  assert.ok(stepped.t < Date.now(), 'the frame does not reach now');
  assert.ok(stepped.t - behind < 250 * 600, 'the 2.5 min step is cut short of now');

  await new Promise((resolve) => setTimeout(resolve, 40));
  page.frame(at + 2040);
  const caught = page.snap();
  assert.equal(caught.live, true, 'a later frame after the wall moves goes live');
  assert.equal(caught.playing, false, 'goLive stops the continue');
  assert.ok(Math.abs(caught.t - Date.now()) < 1000, 'goLive parks the playhead on now');

  const far = at - (15 * 60 * 1000 - 1000);
  page.pauseAt(far, ev, 3600);
  page.clickPlay();
  const fast = page.snap();
  assert.equal(fast.playing, true, 'just under 15 min behind at 3600× continues');
  assert.equal(fast.replay, false);
  assert.equal(fast.t, far);

  page.pauseAt(behind, ev, 600);
  page.setReduced(true);
  page.clickPlay();
  page.frame(at + 1000);
  const quiet = page.snap();
  assert.equal(quiet.playing, false, 'reduced motion does not start the resume');
  assert.equal(quiet.live, false, 'reduced motion does not go live on the next frame');
  assert.equal(quiet.replay, false);

  page.pauseAt(at, []);
  page.clickPlay();
  page.frame(at + 1000);
  const empty = page.snap();
  assert.equal(empty.playing, false, 'startReplay with no events does not set playing');
  assert.equal(empty.live, false);
  assert.equal(empty.replay, false);
});

test('wave count tiles title the 24h ids, capped at 20', () => {
  assert.match(html, /d\.title = idTitle\(x\[2\]\)/);
  assert.match(html, /b\.note/);
  assert.match(html, /note\.slice\(0, 72\)/);
  assert.match(html, /issues_opened_24h_ids/);
  assert.doesNotMatch(html, /state\.t \+ 250 \* speed/);
  const fn = html.match(/function idTitle\(ids\) \{[\s\S]*?\n    \}/);
  assert.ok(fn, 'idTitle is in the page');
  const idTitle = new Function(`${fn[0]}; return idTitle;`)();
  assert.equal(idTitle(['acme/app#1', 'acme/app#2']), 'acme/app#1, acme/app#2');
  const ids = Array.from({ length: 22 }, (_, i) => `acme/app#${i + 1}`);
  assert.equal(idTitle(ids), `${ids.slice(0, 20).join(', ')} +2 more`);
  assert.equal(idTitle([]), '');
});

test('CI who is the credit and the mesh source stays GitHub', async () => {
  const vm = await import('node:vm');
  const pub = path.join(APP, 'public');
  const ctx = { window: {}, console, URLSearchParams, location: { search: '', hash: '', href: 'http://x/' }, document: { addEventListener() {} } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(pub, 'live-config.js'), 'utf8'), ctx);
  const L = ctx.LiveMesh;
  const row = (id, credit) => ({ id, t_ct: '2026-10-20T12:00:00-05:00', kind: 'workflow_run', from: 'CI', to: 'GitHub', credit, label: 'run ' + id });
  const fed = L.applyFeed({ events: [], live: true, t: 0 }, { events: [row('forge-row', 'forge'), row('blaze-row', 'Blaze'), row('gh-row', 'github')] }).state.events;
  const by = Object.fromEntries(fed.map(e => [e.credit, e]));
  assert.equal(by.forge.from, 'GitHub');
  assert.equal(by.forge.credit, 'forge');
  assert.equal(L.whoTag(by.forge), 'forge');
  assert.equal(by.Blaze.from, 'GitHub');
  assert.equal(L.whoTag(by.Blaze), 'Blaze');
  assert.equal(by.github.from, 'GitHub');
  assert.equal(L.whoTag(by.github), 'GITHUB');
  assert.equal(L.whoTag({ kind: 'pr_open', from: 'forge', credit: 'forge' }), 'FORGE');
});

test('kit live-config carries no install brand (no Example / example.com); product names come from the feed header', () => {
  for (const f of [path.join(APP, 'public', 'live-config.js'), path.join(APP, '..', 'feed', 'live-config.js')]) {
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /Example|example\.com/, f);
  }
  const L = loadCfg(false);
  const out = L.applyFeed({}, { product_nodes: ['burst-live'], events: [{ id: 1, t_ct: '2026-10-13T10:00:00-05:00', from: 'Railway', to: 'burst-live' }] }).state.events;
  assert.equal(out[0].to, 'mymuse.house');
});
