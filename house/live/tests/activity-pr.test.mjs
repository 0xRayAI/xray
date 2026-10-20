// A cloud-agent activity line can carry an https GitHub pull URL.
// The card ref stays on tag. javascript:, data:, and http: are refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenPort } from './free-port.mjs';
import { cardRefOf, safePrUrl } from '../app/worktrack.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const KEY = 'writer-key';
const ACME = 'https://github.com/acme/app/pull/15';
const WIDGETS = 'https://github.com/example-org/widgets/pull/4';
const LONG = 'https://github.com/acme/' + 'a'.repeat(50) + '/pull/15';
const BANNED = 'https://github.com/acme/message/pull/15';

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function sign(hookSecret, body) { return 'sha256=' + crypto.createHmac('sha256', hookSecret).update(body).digest('hex'); }
function stamp(ms) { return new Date(Date.now() + ms).toISOString(); }

function stopped(child) {
  return new Promise(resolve => {
    if (child.exitCode != null) return resolve();
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, 2000);
  });
}

async function boot(data) {
  const password = crypto.randomBytes(8).toString('hex');
  const hookSecret = crypto.randomBytes(24).toString('hex');
  const child = spawn(process.execPath, [APP], {
    env: {
      PATH: process.env.PATH,
      PORT: '0',
      MESH_DATA_DIR: data,
      COLLECTOR: 'off',
      GITHUB_API_URL: 'http://127.0.0.1:9',
      MESH_PASSWORD: password,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      CURSOR_WEBHOOK_SECRET: hookSecret,
      LIVE_SEAT_IDS: 'writer',
      SEAT_KEYS: JSON.stringify({ writer: sha(KEY) }),
      SEAT_AGENT_MAP: JSON.stringify({ 'bc-prlink01': 'writer' }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const port = await listenPort(child);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/healthz')).status) return { child, base, password, hookSecret, logs: () => logs }; } catch { /* booting */ }
    await new Promise(r => setTimeout(r, 40));
  }
  child.kill();
  throw new Error('server did not boot: ' + logs.slice(0, 500));
}

async function login(ctx) {
  const res = await fetch(ctx.base + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'password=' + encodeURIComponent(ctx.password),
    redirect: 'manual',
  });
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

async function postActivity(ctx, body) {
  const res = await fetch(ctx.base + '/activity', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed };
}

async function rowOf(ctx, cookie, id) {
  const res = await fetch(ctx.base + '/live-events.json', { headers: { Cookie: cookie } });
  assert.equal(res.status, 200);
  const live = await res.json();
  return (live.cloud_agents || []).find(item => item.bcId === id);
}

async function withServer(fn) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-pr-'));
  const ctx = await boot(data);
  try { await fn(ctx); }
  finally {
    await stopped(ctx.child);
    fs.rmSync(data, { recursive: true, force: true });
  }
}

test('a 39-character owner still cards and a 40-character hyphenated owner is empty', () => {
  const owner39 = 'a'.repeat(39);
  const owner39h = 'a' + '-b'.repeat(19);
  const owner40 = 'a' + '-b'.repeat(19) + 'c';
  assert.equal(owner39.length, 39);
  assert.equal(owner39h.length, 39);
  assert.equal(owner40.length, 40);
  const ok = 'https://github.com/' + owner39 + '/app/pull/1';
  const hyphenOk = 'https://github.com/' + owner39h + '/app/pull/1';
  const bad = 'https://github.com/' + owner40 + '/app/pull/1';
  assert.equal(safePrUrl(ok), ok);
  assert.equal(cardRefOf(ok), owner39 + '/app#1');
  assert.equal(safePrUrl(hyphenOk), hyphenOk);
  assert.equal(cardRefOf(hyphenOk), owner39h + '/app#1');
  assert.equal(safePrUrl(bad), '');
  assert.equal(cardRefOf(bad), '');
  const repo100 = 'r' + 'e'.repeat(99);
  const repo101 = 'r' + 'e'.repeat(100);
  const kept = 'https://github.com/acme/' + repo100 + '/pull/1';
  assert.equal(repo100.length, 100);
  assert.equal(safePrUrl(kept), kept);
  assert.equal(cardRefOf(kept), 'acme/' + repo100 + '#1');
  assert.equal(safePrUrl('https://github.com/acme/' + repo101 + '/pull/1'), '');
});

test('cloud-agents field lists name pr inside the braces and the parentheses', () => {
  const lines = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'board.md'), 'utf8').split('\n');
  const brace = lines[86].match(/\{[^}]*\}/);
  assert.ok(brace, 'line 87 brace list');
  assert.match(brace[0], /"pr"/);
  const paren = lines[110].match(/\([^)]*\)/);
  assert.ok(paren, 'line 111 parenthetical');
  assert.match(paren[0], /`pr`/);
  assert.match(lines[112], /six fields/);
  const rows = lines.slice(98, 104);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((row) => (row.match(/`([^`]+)`/) || [])[1]),
    ['bcId', 'seat', 'card', 'pr', 'state', 'updated_ct'],
  );
});

test('a dot-segment pull URL is empty and a dotted repo still cards', () => {
  const bad = 'https://github.com/../../pull/1';
  assert.equal(safePrUrl(bad), '');
  assert.equal(cardRefOf(bad), '');
  assert.equal(cardRefOf('../..#1'), '');
  assert.equal(safePrUrl('  https://github.com/acme/repo.name/pull/2  '), 'https://github.com/acme/repo.name/pull/2');
  assert.equal(cardRefOf('https://github.com/acme/repo.name/pull/2'), 'acme/repo.name#2');
  assert.equal(cardRefOf('https://github.com/owner/repo/pull/1'), 'owner/repo#1');
  const board = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'board.md'), 'utf8');
  assert.match(board, /when the webhook or a cloud-agent activity line sent one/);
  const plate = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs-site', 'docs', 'plates', 'bifrost.md'), 'utf8');
  assert.match(plate, /pull URL/);
  assert.match(plate, /The pull URL is the row's `pr`/);
  const cloudRow = plate.split('\n')[45];
  const fieldList = cloudRow.split('The pull URL')[0];
  assert.match(fieldList, /`pr`/);
  assert.match(cloudRow, /The Cursor webhook and seat activity `kind: cloud_agent` feed that row\./);
  assert.match(cloudRow, /The pull URL is the row's `pr`\./);
});

test('(a) an activity-only URL is shown', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01', pr: ACME,
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    const row = await rowOf(ctx, await login(ctx), 'bc-actonly01');
    assert.ok(row, 'activity-only row missing');
    assert.equal(row.pr, ACME);
    assert.equal(row.card, 'acme/app#15');
  });
});

test('(b) a webhook URL is replaced by a later activity URL', async () => {
  await withServer(async ctx => {
    const payload = {
      id: 'bc-prlink01', status: 'RUNNING', metadata: { seat: 'writer' },
      target: { prUrl: ACME }, summary: 'board row',
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const hooked = await fetch(ctx.base + '/cursor/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': sign(ctx.hookSecret, raw),
        'X-Webhook-Id': 'run-prlink',
      },
      body: raw,
    });
    assert.equal(hooked.status, 200, await hooked.clone().text());
    const cookie = await login(ctx);
    let row = await rowOf(ctx, cookie, 'bc-prlink01');
    assert.equal(row.pr, ACME);
    const posted = await postActivity(ctx, {
      t_ct: stamp(2000), kind: 'cloud_agent', action: 'launch', agent: 'bc-prlink01', pr: WIDGETS,
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    row = await rowOf(ctx, cookie, 'bc-prlink01');
    assert.equal(row.pr, WIDGETS);
  });
});

test('(c) a later tag-only row leaves the URL in place', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01', pr: WIDGETS,
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    const cookie = await login(ctx);
    const tagged = await postActivity(ctx, {
      t_ct: stamp(2000), kind: 'cloud_agent', action: 'reply', agent: 'bc-actonly01', tag: 'acme/app#15',
    });
    assert.equal(tagged.status, 202, JSON.stringify(tagged.body));
    const row = await rowOf(ctx, cookie, 'bc-actonly01');
    assert.ok(row, 'activity row missing');
    assert.equal(row.pr, WIDGETS);
    assert.equal(row.card, 'acme/app#15');
  });
});

test('(d) a non-github pull URL is refused and the board pr stays empty', async () => {
  await withServer(async ctx => {
    const launched = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01',
    });
    assert.equal(launched.status, 202, JSON.stringify(launched.body));
    const posted = await postActivity(ctx, {
      t_ct: stamp(2000), kind: 'cloud_agent', action: 'reply', agent: 'bc-actonly01',
      pr: 'https://evil.railway.app/x',
    });
    assert.equal(posted.status, 422, JSON.stringify(posted.body));
    assert.equal(posted.body.error, 'bad pr');
    const row = await rowOf(ctx, await login(ctx), 'bc-actonly01');
    assert.ok(row, 'activity row missing');
    assert.equal(row.pr, '');
  });
});

test('(e) an over-80 GitHub pull URL is kept', async () => {
  await withServer(async ctx => {
    assert.ok(LONG.length > 80, String(LONG.length));
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01', pr: LONG,
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    const row = await rowOf(ctx, await login(ctx), 'bc-actonly01');
    assert.ok(row, 'activity row missing');
    assert.equal(row.pr, LONG);
  });
});

test('(f) a GitHub pull URL containing a banned word is kept', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01', pr: BANNED,
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    const row = await rowOf(ctx, await login(ctx), 'bc-actonly01');
    assert.ok(row, 'activity row missing');
    assert.equal(row.pr, BANNED);
  });
});

test('(h) surrounding spaces are stored trimmed', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01',
      pr: '  ' + ACME + '  ',
    });
    assert.equal(posted.status, 202, JSON.stringify(posted.body));
    const row = await rowOf(ctx, await login(ctx), 'bc-actonly01');
    assert.ok(row, 'activity row missing');
    assert.equal(row.pr, ACME);
    assert.equal(row.card, 'acme/app#15');
  });
});

test('(g) a pull files suffix is refused', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01',
      pr: 'https://github.com/acme/app/pull/15/files',
    });
    assert.equal(posted.status, 422, JSON.stringify(posted.body));
    assert.equal(posted.body.error, 'bad pr');
  });
});
