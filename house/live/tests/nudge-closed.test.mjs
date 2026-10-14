// Nudge skips closed / merged items: an unacked line on a PR that merged (or an issue that closed) gets no nudge; a line
// on an open item still does. Uses the close / merge events the collector already writes to the feed.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const got = [];
const sink = http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { got.push({ path: q.url, body: JSON.parse(b || '{}') }); s.writeHead(200); s.end('{}'); }); });
await new Promise(r => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}`, R = 'example-org/x';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-closed-')), ROUTE = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-closed-r-'));
const ago = s => new Date(Date.now() - s * 1000).toISOString();
const line = (id, number) => ({ id, t_ct: ago(3600), seat: 'forge', type: 'pr_comment', repo: R, number, title: 't', url: `https://github.com/${R}/pull/${number}`, reason: 'ask' });
fs.mkdirSync(path.join(DATA, 'live', 'inbox'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'live', 'inbox', 'forge.jsonl'), [line('merged-1', 283), line('closed-1', 284), line('open-1', 285)].map(l => JSON.stringify(l)).join('\n') + '\n');
fs.mkdirSync(path.join(DATA, 'feed'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify({ generated_at: ago(0), events: [
  { id: `${R}#283:merged`, t_ct: ago(1800), kind: 'merged', repo: R, number: 283, label: 'merged #283' },
  { id: `${R}!284:ev:1`, t_ct: ago(1800), kind: 'issue_close', repo: R, number: 284, label: 'closed issue #284' },
  { id: `${R}#285:open`, t_ct: ago(7200), kind: 'pr_open', repo: R, number: 285, label: 'opened #285' }] }));
fs.writeFileSync(path.join(ROUTE, 'inbox-roles.json'), JSON.stringify({ seats: { coord: { seat: 'critic' } }, extra_seats: { forge: { needles: ['@forge'] } } }));
fs.writeFileSync(path.join(ROUTE, 'roster.json'), JSON.stringify({ seats: ['forge', 'critic'] }));
let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: '0', PATH: process.env.PATH, LIVE_PUBLIC: '1', SERVER_ROUTING: 'off',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'), MESH_DATA_DIR: DATA,
  SEAT_WEBHOOKS: JSON.stringify({ forge: { url: `${W}/forge` }, critic: { url: `${W}/critic` } }), WAKE_KEY_FORGE: 'k', WAKE_KEY_CRITIC: 'k',
  WAKE_RETRY_MS: '10', WAKE_STAGGER_MS: '0', WAKE_DEBOUNCE_S: '0', NUDGE_LINE_S: '1', BIFROST_TICK_S: '0.2', BIFROST_TRIPWIRE_MINUTES: '60',
  BIFROST_ROUTING_DIR: ROUTE, BIFROST_ROSTER: path.join(ROUTE, 'roster.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
after(async () => { srv.kill(); await new Promise(r => srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)); sink.close(); fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); fs.rmSync(ROUTE, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); });
const until = async fn => { for (let i = 0; i < 100 && !fn(); i++) await new Promise(r => setTimeout(r, 100)); return fn(); };

test('a merged PR and a closed issue get no nudge; an open PR still does', async () => {
  assert.ok(await until(() => got.some(g => g.path === '/forge' && g.body.inbox_id === 'open-1' && /^nudge L1/.test(g.body.reason))), logs + JSON.stringify(got));
  await new Promise(r => setTimeout(r, 1500));
  // a nudge wake names its lines in inbox_id (the one shown) and ids (every line it re-raises): neither may carry a closed item
  const nudged = new Set(got.filter(g => /^nudge L/.test(g.body.reason || '')).flatMap(g => [g.body.inbox_id, ...(g.body.ids || [])]));
  assert.ok(!nudged.has('merged-1'), 'merged #283 nudged');
  assert.ok(!nudged.has('closed-1'), 'closed #284 nudged');
});
