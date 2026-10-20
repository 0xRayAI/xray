// Wake gate: one seat, one real wake. Time is injected. The server cases cover forge vs blinky, labels, and the stat gate.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenPort } from './free-port.mjs';
import {
  ROLLING_HOUR_MS, wakeConfig, createWakeState, classifyBatch, gateLine, noteSent, releaseDue,
  publicStats, fullStats, isP1Issue, hasSha,
} from '../app/wake-gate.mjs';

const cfg = wakeConfig({ WAKE_KIND_COOLDOWN_S: '900', WAKE_MAX_PER_HOUR: '6', LIVE_TURN_OPEN_MIN: '20', WAKE_BATCH_S: '0' });
const T0 = 1_700_000_000_000;
const line = (over) => ({ id: over.id || 'l', type: over.type || 'pr_commit', repo: over.repo || 'acme/one', number: over.number ?? 1, title: 't', url: 'https://github.com/acme/one', reason: over.reason || 'ask', ...over });

test('BIFROST_WAKES off, 0, false, and no pause every wake', () => {
  for (const v of ['off', '0', 'false', 'no', 'OFF']) assert.equal(wakeConfig({ BIFROST_WAKES: v }).paused, true, v);
  assert.equal(wakeConfig({}).paused, false);
  const d = gateLine({ seat: 'forge', line: line({ id: 'p' }) }, createWakeState(), T0, wakeConfig({ BIFROST_WAKES: 'off' }));
  assert.equal(d.reason, 'paused');
});

test('critic new head, forge ci_fail, one mention, and a clock wake each have one target', () => {
  const critic = classifyBatch([line({ id: 'h', seat: 'critic', type: 'pr_commit', sha: 'abc' })]);
  assert.deepEqual(critic.wakes.map(w => w.seat), ['critic']);
  const both = classifyBatch([
    line({ id: 'h', seat: 'critic', type: 'pr_commit', sha: 'abc' }),
    line({ id: 'h2', seat: 'blinky', type: 'pr_commit', sha: 'abc' }),
  ]);
  assert.deepEqual(both.wakes.map(w => w.seat).sort(), ['blinky', 'critic']);
  const forge = classifyBatch([line({ id: 'c', seat: 'forge', type: 'ci_fail' })]);
  assert.deepEqual(forge.wakes.map(w => w.seat), ['forge']);
  const deploy = classifyBatch([line({ id: 'd', seat: 'forge', type: 'deploy_fail' })]);
  assert.deepEqual(deploy.wakes.map(w => w.seat), ['forge']);
  const mention = classifyBatch([line({ id: 'm', seat: 'mill', type: 'pr_open', reason: 'mention @mill' })]);
  assert.deepEqual(mention.wakes.map(w => w.seat), ['mill']);
  const clock = classifyBatch([line({ id: 'clock:1:forge', seat: 'forge', type: 'timed_run', reason: 'timed run' })]);
  assert.equal(clock.wakes.length, 1);
  assert.equal(clock.wakes[0].line.clock, true);
});

test('handoff to, card owner, unassigned, ack, turn, and own post', () => {
  const to = classifyBatch([line({ id: 'to', seat: '', to: 'critic', type: 'nudge', reason: 'handoff' })]);
  assert.deepEqual(to.wakes.map(w => w.seat), ['critic']);
  const owner = classifyBatch([line({ id: 'ow', seat: '', type: 'pr_commit', reason: 'card' })], { owner: () => 'mill' });
  assert.deepEqual(owner.wakes.map(w => w.seat), ['mill']);
  const none = classifyBatch([line({ id: 'u', seat: '', type: 'pr_commit', reason: 'loose' })]);
  assert.equal(none.wakes.length, 0);
  assert.equal(none.skips[0].reason, 'unassigned');
  assert.equal(classifyBatch([line({ id: 'a', seat: 'forge', type: 'ack', reason: 'ack' })]).skips[0].reason, 'ack');
  assert.equal(classifyBatch([line({ id: 't', seat: 'forge', type: 'turn', reason: 'turn' })]).skips[0].reason, 'turn');
  assert.equal(classifyBatch([line({ id: 'o', seat: 'forge', from: 'forge', type: 'pr_comment', reason: 'mine' })]).skips[0].reason, 'own_post');
});

test('unassigned issue_open wakes forge and blinky is only the extra copy', () => {
  const out = classifyBatch([line({ id: 'iss-1', seat: 'blinky', type: 'issue_open', reason: 'opened' })]);
  assert.deepEqual(out.wakes.map(w => w.seat), ['forge']);
  assert.equal(out.skips[0].reason, 'fanout');
  assert.equal(out.skips[0].seat, 'blinky');
  const owned = classifyBatch([line({ id: 'iss-2', seat: 'blinky', type: 'issue_open', reason: 'opened' })], { owner: () => 'mill' });
  assert.deepEqual(owned.wakes.map(w => w.seat), ['mill']);
  assert.equal(owned.skips.some(s => s.seat === 'forge'), false);
});

test('labels is the P1 field, and a P1 pull request does not wake forge', () => {
  assert.equal(isP1Issue(line({ type: 'issue_labeled', labels: ['P1'] })), true);
  assert.equal(isP1Issue(line({ type: 'issue_open', labels: ['p1'] })), true);
  assert.equal(isP1Issue(line({ type: 'pr_labeled', labels: ['P1'] })), false);
  assert.equal(isP1Issue(line({ type: 'issue_open', labels: ['bug'] })), false);
  const p1 = classifyBatch([line({ id: 'p1', seat: 'blinky', type: 'issue_labeled', labels: ['P1'], reason: 'labeled' })]);
  assert.deepEqual(p1.wakes.map(w => w.seat), ['forge']);
  assert.equal(p1.skips[0].reason, 'fanout');
  const pr = classifyBatch([line({ id: 'prp', seat: 'blinky', type: 'pr_labeled', labels: ['P1'], reason: 'labeled' })]);
  assert.deepEqual(pr.wakes.map(w => w.seat), ['blinky']);
});

test('a pr_comment stored for blinky and the author wakes the author, and a mention still wakes', () => {
  const out = classifyBatch([
    line({ id: 'c1', seat: 'blinky', type: 'pr_comment', reason: 'comment watch' }),
    line({ id: 'c1', seat: 'forge', type: 'pr_comment', reason: 'comment on your PR (merged PR)' }),
    line({ id: 'c1', seat: 'mill', type: 'pr_comment', reason: 'mention @mill' }),
  ]);
  assert.deepEqual(out.wakes.map(w => w.seat).sort(), ['forge', 'mill']);
  assert.equal(out.skips.filter(s => s.seat === 'blinky' && s.reason === 'fanout').length, 1);
  const plain = classifyBatch([
    line({ id: 'c2', seat: 'blinky', type: 'pr_comment', reason: 'comment watch' }),
    line({ id: 'c2', seat: 'herald', type: 'pr_comment', reason: 'note' }),
  ]);
  assert.deepEqual(plain.wakes.map(w => w.seat), ['herald']);
});

test('a missing sha is not a shared sha; the same key with no sha is a cooldown', () => {
  assert.equal(hasSha({ sha: '' }), false);
  assert.equal(hasSha({}), false);
  const st = createWakeState();
  const first = line({ id: 'i1', type: 'issue_open', number: 4, sha: '' });
  assert.equal(gateLine({ seat: 'forge', line: first }, st, T0, cfg).op, 'send');
  noteSent(st, 'forge', [first], T0);
  const other = gateLine({ seat: 'forge', line: line({ id: 'i2', type: 'issue_open', number: 9 }) }, st, T0 + 1000, cfg);
  assert.equal(other.op, 'send');
  const again = gateLine({ seat: 'forge', line: line({ id: 'i3', type: 'issue_open', number: 4 }) }, st, T0 + 1000, cfg);
  assert.equal(again.reason, 'cooldown');
  assert.notEqual(again.reason, 'repeat_sha');
});

test('two readys on different PRs inside 900s both send; the same sha is repeat_sha', () => {
  const st = createWakeState();
  const a = line({ id: 'r1', type: 'ready', number: 1, sha: 'aaa' });
  assert.equal(gateLine({ seat: 'forge', line: a }, st, T0, cfg).op, 'send');
  noteSent(st, 'forge', [a], T0);
  const b = gateLine({ seat: 'forge', line: line({ id: 'r2', type: 'ready', number: 2, sha: 'bbb' }) }, st, T0 + 1000, cfg);
  assert.equal(b.op, 'send');
  const same = gateLine({ seat: 'forge', line: line({ id: 'r3', type: 'ready', number: 1, sha: 'aaa' }) }, st, T0 + 1000, cfg);
  assert.equal(same.reason, 'repeat_sha');
  const inside = gateLine({ seat: 'forge', line: line({ id: 'r4', type: 'ready', number: 1, sha: 'ccc' }) }, st, T0 + 899999, cfg);
  assert.equal(inside.op, 'queue');
  const edge = createWakeState();
  noteSent(edge, 'forge', [line({ id: 'e0', type: 'ready', number: 1, sha: 'aaa' })], T0);
  assert.equal(gateLine({ seat: 'forge', line: line({ id: 'e1', type: 'ready', number: 1, sha: 'ccc' }) }, edge, T0 + 900000, cfg).op, 'send');
});

test('a new sha inside the cooldown is queued and sent when the window rolls', () => {
  const st = createWakeState();
  const first = line({ id: 'n1', type: 'pr_commit', sha: 'aaa' });
  noteSent(st, 'critic', [first], T0);
  const next = line({ id: 'n2', type: 'pr_commit', sha: 'bbb' });
  const q = gateLine({ seat: 'critic', line: next }, st, T0 + 1000, cfg);
  assert.equal(q.op, 'queue');
  st.hold.push({ seat: 'critic', line: next, until: q.until });
  assert.equal(releaseDue(st, T0 + 899999, cfg).due.length, 0);
  const due = releaseDue(st, T0 + 900000, cfg);
  assert.equal(due.due.length, 1);
  assert.equal(due.due[0].op, 'send');
});

test('the 7th new sha waits for the rolling hour, and a hotfix skips the cap and the cooldown', () => {
  const st = createWakeState();
  for (let i = 0; i < 6; i++) {
    const row = line({ id: 's' + i, type: 'pr_commit', number: 100 + i, sha: 'sha-' + i });
    assert.equal(gateLine({ seat: 'critic', line: row }, st, T0 + i * 1000, cfg).op, 'send');
    noteSent(st, 'critic', [row], T0 + i * 1000);
  }
  const seventh = line({ id: 's7', type: 'pr_commit', number: 200, sha: 'sha-7' });
  const q = gateLine({ seat: 'critic', line: seventh }, st, T0 + 7000, cfg);
  assert.equal(q.op, 'queue');
  st.hold.push({ seat: 'critic', line: seventh, until: q.until });
  assert.equal(releaseDue(st, T0 + ROLLING_HOUR_MS - 1, cfg).due.length, 0);
  assert.equal(releaseDue(st, T0 + ROLLING_HOUR_MS, cfg).due.length, 1);
  const cool = createWakeState();
  noteSent(cool, 'forge', [line({ id: 'c0', type: 'ci_fail', number: 3 })], T0);
  for (let i = 0; i < 6; i++) noteSent(cool, 'forge', [line({ id: 'cap' + i, type: 'pr_commit', number: 30 + i, sha: 'z' + i })], T0 + i);
  const blocked = gateLine({ seat: 'forge', line: line({ id: 'c1', type: 'ci_fail', number: 3 }) }, cool, T0 + 1000, cfg);
  assert.equal(blocked.reason, 'cooldown');
  const hot = gateLine({ seat: 'forge', line: line({ id: 'c2', type: 'ci_fail', number: 3, flag: 'hotfix' }) }, cool, T0 + 1000, cfg);
  assert.equal(hot.op, 'send');
});

test('a clock wake still sends over the cap, and it waits out an open turn', () => {
  const st = createWakeState();
  for (let i = 0; i < 6; i++) noteSent(st, 'forge', [line({ id: 'k' + i, sha: 'k' + i, number: i + 1 })], T0);
  const clock = line({ id: 'clock:1', seat: 'forge', type: 'timed_run', reason: 'nudge L1: still open' });
  assert.equal(gateLine({ seat: 'forge', line: clock }, st, T0 + 10, cfg).op, 'send');
  st.turnOpen.set('forge', T0 + 10);
  const held = gateLine({ seat: 'forge', line: clock }, st, T0 + 20, cfg);
  assert.equal(held.op, 'queue');
  st.hold.push({ seat: 'forge', line: clock, until: held.until });
  st.turnOpen.delete('forge');
  assert.equal(releaseDue(st, T0 + 30, cfg).due.length, 1);
});

test('public stats have counts only; the full stat keeps the skip id', () => {
  const st = createWakeState();
  st.sent.push({ t: T0, seat: 'forge', id: 'sent-id' });
  st.skips.push({ t: T0, seat: 'blinky', reason: 'fanout', id: 'skip-id-zz', kind: 'issue_open' });
  const pub = publicStats(st, T0, cfg.statMs);
  assert.equal(JSON.stringify(pub).includes('skip-id-zz'), false);
  assert.equal(JSON.stringify(pub).includes('sent-id'), false);
  assert.equal(pub.seats.forge.sent, 1);
  assert.equal(pub.seats.blinky.skipped, 1);
  const full = fullStats(st, T0, cfg.statMs);
  assert.equal(full.seats.blinky.skips[0].id, 'skip-id-zz');
  assert.equal(full.seats.blinky.skips[0].reason, 'fanout');
});

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const got = [];
const sink = http.createServer((q, s) => {
  let b = '';
  q.on('data', d => { b += d; });
  q.on('end', () => { got.push({ path: q.url, body: JSON.parse(b || '{}') }); s.writeHead(200); s.end('{}'); });
});
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-gate-'));
const ING = crypto.randomBytes(32).toString('hex');
const FKEY = 'forge-key-' + crypto.randomBytes(6).toString('hex');
const hooks = ['forge', 'blinky', 'herald', 'critic'].map(s => [s, { url: `${W}/${s}` }]);
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
  env: {
    PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', MESH_DATA_DIR: DATA, INGEST_SECRET: ING,
    MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    SEAT_WEBHOOKS: JSON.stringify(Object.fromEntries(hooks)),
    WAKE_KEY_FORGE: 'kf', WAKE_KEY_BLINKY: 'kb', WAKE_KEY_HERALD: 'kh', WAKE_KEY_CRITIC: 'kc',
    WAKE_BATCH_S: '0', WAKE_STAGGER_MS: '0', WAKE_COALESCE_MS: '20', WAKE_RETRY_MS: '10', LIVE_TURN_OPEN_MIN: '0',
    SEAT_KEYS: JSON.stringify({ forge: crypto.createHash('sha256').update(FKEY).digest('hex') }),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
srv.stdout.on('data', d => { logs += d; });
srv.stderr.on('data', d => { logs += d; });
let BASE = '';
const port = await listenPort(srv);
BASE = `http://127.0.0.1:${port}`;
after(async () => {
  srv.kill();
  await new Promise(r => (srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)));
  sink.close();
  fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});
const until = async fn => { for (let i = 0; i < 80 && !fn(); i++) await new Promise(r => setTimeout(r, 50)); return fn(); };
const post = async (lines) => {
  const res = await fetch(BASE + '/inbox', { method: 'POST', headers: { 'X-Live-Ingest': ING, 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};
const row = (over) => ({
  id: over.id, t_ct: new Date().toISOString(), seat: over.seat, type: over.type, repo: over.repo || 'acme/one',
  number: over.number, title: over.title || 't', url: `https://github.com/acme/one/issues/${over.number}`, reason: over.reason || 'ask',
  ...(over.labels ? { labels: over.labels } : {}), ...(over.flag ? { flag: over.flag } : {}), ...(over.sha ? { sha: over.sha } : {}),
});

test('server: unassigned issue and a P1 label wake only forge; health has no skip id', async () => {
  const bad = await post([row({ id: 'bad-label', seat: 'forge', type: 'issue_open', number: 1, reason: 'bad', labels: ['has space'] })]);
  assert.equal(bad.status, 400);
  assert.match(bad.body.error || '', /labels must be a list of short names/);
  const issueId = 'issue-open-unassigned-zz9';
  assert.equal((await post([row({ id: issueId, seat: 'blinky', type: 'issue_open', number: 11, reason: 'opened' })])).status, 200);
  assert.ok(await until(() => got.some(g => g.path === '/forge' && g.body.inbox_id === issueId)), logs);
  assert.equal(got.some(g => g.path === '/blinky' && g.body.inbox_id === issueId), false);
  const p1 = 'issue-p1-zz9';
  assert.equal((await post([row({ id: p1, seat: 'blinky', type: 'issue_labeled', number: 12, reason: 'labeled', labels: ['P1'] })])).status, 200);
  assert.ok(await until(() => got.some(g => g.path === '/forge' && g.body.inbox_id === p1)), logs);
  assert.equal(got.some(g => g.path === '/blinky' && g.body.inbox_id === p1), false);
  const health = await (await fetch(BASE + '/healthz')).json();
  assert.equal(JSON.stringify(health).includes(issueId), false);
  assert.equal(JSON.stringify(health).includes(p1), false);
  assert.equal((await fetch(BASE + '/wake-stats')).status, 401);
  const stats = await (await fetch(BASE + '/wake-stats', { headers: { Authorization: 'Bearer ' + FKEY } })).json();
  const skips = Object.values(stats.seats || {}).flatMap(s => s.skips || []);
  assert.ok(skips.some(s => s.id === issueId && s.reason === 'fanout'), JSON.stringify(stats));
});

test('server: a pr_comment wakes the author and the mention, not blinky', async () => {
  const id = 'comment-both-zz';
  const lines = [
    row({ id, seat: 'blinky', type: 'pr_comment', number: 21, reason: 'comment watch' }),
    row({ id, seat: 'forge', type: 'pr_comment', number: 21, reason: 'comment on your PR' }),
    row({ id, seat: 'herald', type: 'pr_comment', number: 21, reason: 'mention @herald' }),
  ];
  assert.equal((await post(lines)).status, 200);
  assert.ok(await until(() => got.some(g => g.path === '/forge' && g.body.inbox_id === id) && got.some(g => g.path === '/herald' && g.body.inbox_id === id)), logs);
  assert.equal(got.some(g => g.path === '/blinky' && g.body.inbox_id === id), false);
});

test('server: three lines batch into one POST; a missing sha is cooldown; a hotfix still posts', async () => {
  const before = got.filter(g => g.path === '/forge').length;
  const batch = [1, 2, 3].map(n => row({ id: 'batch-' + n, seat: 'forge', type: 'ready', number: 40 + n, reason: 'ready ' + n }));
  assert.equal((await post(batch)).status, 200);
  assert.ok(await until(() => got.filter(g => g.path === '/forge').length > before), logs);
  const hit = got.filter(g => g.path === '/forge').at(-1);
  assert.equal(hit.body.lines.length, 3);
  assert.deepEqual(hit.body.ids, ['batch-1', 'batch-2', 'batch-3']);
  const first = got.length;
  assert.equal((await post([row({ id: 'nosha-1', seat: 'forge', type: 'issue_open', number: 50, reason: 'one' })])).status, 200);
  assert.ok(await until(() => got.length > first), logs);
  const mid = got.length;
  assert.equal((await post([row({ id: 'nosha-2', seat: 'forge', type: 'issue_open', number: 50, reason: 'two' })])).status, 200);
  await new Promise(r => setTimeout(r, 200));
  assert.equal(got.length, mid);
  assert.match(logs, /wake: skip forge cooldown nosha-2/);
  assert.equal(logs.includes('repeat_sha nosha-2'), false);
  assert.equal((await post([row({ id: 'nosha-3', seat: 'forge', type: 'issue_open', number: 50, reason: 'hot', flag: 'hotfix' })])).status, 200);
  assert.ok(await until(() => got.some(g => g.body.inbox_id === 'nosha-3')), logs);
});
