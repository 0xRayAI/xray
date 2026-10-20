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

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs');
const KEY = 'writer-key';
const ACME = 'https://github.com/acme/app/pull/15';
const WIDGETS = 'https://github.com/example-org/widgets/pull/4';

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

test('(a) an activity-only cloud agent keeps its pull URL', async () => {
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

test('(b) an http pull URL is refused', async () => {
  await withServer(async ctx => {
    const posted = await postActivity(ctx, {
      t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01',
      pr: 'http://github.com/acme/app/pull/15',
    });
    assert.equal(posted.status, 422);
    assert.equal(posted.body.error, 'bad pr');
  });
});

test('(c) javascript and data URLs are refused', async () => {
  await withServer(async ctx => {
    for (const pr of ['javascript:alert', 'data:image/png']) {
      const posted = await postActivity(ctx, {
        t_ct: stamp(0), kind: 'cloud_agent', action: 'launch', agent: 'bc-actonly01', pr,
      });
      assert.equal(posted.status, 422, pr);
      assert.equal(posted.body.error, 'bad pr', pr);
    }
  });
});

test('(d) a card tag stays on the card and a later line keeps the pull URL', async () => {
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
    const linked = await postActivity(ctx, {
      t_ct: stamp(2000), kind: 'cloud_agent', action: 'launch', agent: 'bc-prlink01',
      tag: 'example-org/widgets#9', pr: WIDGETS,
    });
    assert.equal(linked.status, 202, JSON.stringify(linked.body));
    const cookie = await login(ctx);
    let row = await rowOf(ctx, cookie, 'bc-prlink01');
    assert.equal(row.card, 'example-org/widgets#9');
    assert.equal(row.pr, WIDGETS);
    const later = await postActivity(ctx, {
      t_ct: stamp(4000), kind: 'cloud_agent', action: 'reply', agent: 'bc-prlink01',
    });
    assert.equal(later.status, 202, JSON.stringify(later.body));
    row = await rowOf(ctx, cookie, 'bc-prlink01');
    assert.equal(row.pr, WIDGETS);
    const cardRef = await postActivity(ctx, {
      t_ct: stamp(6000), kind: 'cloud_agent', action: 'reply', agent: 'bc-prlink01', pr: 'acme/app#15',
    });
    assert.equal(cardRef.status, 422);
    assert.equal(cardRef.body.error, 'bad pr');
    row = await rowOf(ctx, cookie, 'bc-prlink01');
    assert.equal(row.pr, WIDGETS);
  });
});
