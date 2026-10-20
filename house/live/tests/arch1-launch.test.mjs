// ARCH1 cloud wake. Default off. The seat is arch1. Example repos only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { launchPrompt, parseCloudRepo, verifyCursorWebhook, realPacketKind, createArch1Launch, chicagoDay } from '../app/arch1-launch.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const KEY = 'cursor_test_key_not_a_real_secret';
const SECRET = 'cursor-webhook-secret-test-fixture-32';
const REPO = '0xRayAI/xray';

function sign(secret, body) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function line(over = {}) {
  return {
    id: over.id || ('ln-' + crypto.randomBytes(4).toString('hex')),
    t_ct: new Date().toISOString(),
    seat: over.seat || 'arch1',
    type: over.type || 'dispatch',
    repo: over.repo || '0xRayAI/xray',
    number: over.number ?? 7,
    sha: over.sha || 'abc1234',
    title: over.title || 'card work',
    url: over.url || 'https://github.com/0xRayAI/xray/issues/7',
    reason: over.reason || 'new issue, next ARCH1',
  };
}

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function writeCards(data, cards) {
  const dir = path.join(data, 'live');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(), cards,
  }));
}

async function boot(extra = {}, prep) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-a1l-'));
  if (prep) prep(data);
  const calls = [];
  const cursor = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let body = null;
      try { body = JSON.parse(raw); } catch { body = null; }
      const id = 'bc-agent' + String(calls.length + 1).padStart(4, '0');
      calls.push({ url: req.url || '', body, auth: req.headers.authorization || '', id });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id }));
    });
  });
  const cursorPort = await listen(cursor);
  const port = 24000 + Math.floor(Math.random() * 20000);
  const ingest = crypto.randomBytes(16).toString('hex');
  const seatKey = 'arch1-' + crypto.randomBytes(8).toString('hex');
  const pw = crypto.randomBytes(8).toString('hex');
  const logs = [];
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: String(port), MESH_PASSWORD: pw, PATH: process.env.PATH,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ingest,
      MESH_DATA_DIR: data, COLLECTOR: 'off', GITHUB_API_URL: 'http://127.0.0.1:1',
      SEAT_KEYS: JSON.stringify({ arch1: crypto.createHash('sha256').update(seatKey).digest('hex') }),
      CURSOR_API_URL: `http://127.0.0.1:${cursorPort}`,
      CURSOR_API_KEY: KEY,
      CURSOR_WEBHOOK_SECRET: SECRET,
      CURSOR_WEBHOOK_BASE: `http://127.0.0.1:${port}`,
      ARCH1_CLOUD_REPO: REPO,
      ARCH1_LAUNCH_ENABLED: '0',
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', c => logs.push(c.toString()));
  child.stderr.on('data', c => logs.push(c.toString()));
  const base = `http://127.0.0.1:${port}`;
  let up = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/healthz')).status) { up = true; break; } } catch { /* booting */ }
    await new Promise(r => setTimeout(r, 40));
  }
  if (!up) { child.kill(); cursor.close(); throw new Error('server did not boot: ' + logs.join('').slice(0, 400)); }
  const stop = async () => {
    const gone = new Promise(r => { if (child.exitCode != null || child.signalCode) r(); else child.once('exit', r); });
    child.kill();
    cursor.close();
    await gone;
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  };
  return { base, calls, data, ingest, seatKey, pw, logs, stop, child };
}

async function postLines(ctx, lines) {
  const r = await fetch(ctx.base + '/inbox', {
    method: 'POST', body: JSON.stringify({ lines }),
    headers: { 'X-Live-Ingest': ctx.ingest, 'Content-Type': 'application/json' },
  });
  assert.equal(r.status, 200, await r.text());
}

async function inbox(ctx) {
  const r = await fetch(ctx.base + '/inbox/arch1?all=1', { headers: { Authorization: 'Bearer ' + ctx.seatKey } });
  assert.equal(r.status, 200);
  return r.json();
}

async function waitCalls(ctx, n, ms = 2500) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (ctx.calls.length >= n) return;
    await new Promise(r => setTimeout(r, 30));
  }
}

async function settle(ms = 400) {
  await new Promise(r => setTimeout(r, ms));
}

function assertNoSecrets(text) {
  assert.equal(text.includes(KEY), false);
  assert.equal(text.includes(SECRET), false);
}

test('prompt names the inbox and the ack, and drops anything that looks like a secret', () => {
  const text = launchPrompt(line({ title: KEY, reason: SECRET, url: 'https://user:token@github.com/x' }), { RAILWAY_PUBLIC_DOMAIN: 'board.example.com' });
  assert.match(text, /Read the inbox/);
  assert.match(text, /ack the line/);
  assert.match(text, /\/inbox\/arch1/);
  assert.match(text, /house\/live\/tools\/arch1-tui-harness\.sh/);
  assert.match(text, /Push the branch only/);
  assert.match(text, /Never open a pull request or an issue/);
  assert.equal(text.includes(KEY), false);
  assert.equal(text.includes(SECRET), false);
  assert.equal(text.includes('user:token'), false);
  const dirty = parseCloudRepo('https://user:pass@github.com/example/other');
  assert.equal(dirty.repository, 'https://github.com/0xRayAI/xray');
  assert.equal(parseCloudRepo('0xRayAI/xray@develop').ref, 'develop');
  assert.equal(realPacketKind(line({ type: 'nudge', reason: 'nudge L1' })), null);
  assert.equal(realPacketKind(line({ type: 'dispatch', reason: 'nudge the seat' })), null);
  assert.equal(realPacketKind(line({ type: 'ready' })), 'ready');
  assert.equal(realPacketKind(line({ type: 'critic_fail', reason: 'critic FAIL' })), 'critic_fail');
  const body = Buffer.from('{"status":"FINISHED"}');
  assert.equal(verifyCursorWebhook(SECRET, body, sign(SECRET, body)), true);
  assert.equal(verifyCursorWebhook(SECRET, body, sign(SECRET, Buffer.from('{"status":"ERROR"}'))), false);
  assert.equal(verifyCursorWebhook(SECRET, body, 'sha256=abcd'), false);
  assert.equal(verifyCursorWebhook('', body, sign(SECRET, body)), false);
});

test('the disabled switch does not call Cursor, and /healthz hides the secrets', async () => {
  for (const enabled of [undefined, '0']) {
    const extra = enabled === undefined ? { ARCH1_LAUNCH_ENABLED: '' } : { ARCH1_LAUNCH_ENABLED: '0' };
    const ctx = await boot(extra);
    try {
      await postLines(ctx, [line({ id: 'off-' + (enabled || 'unset'), type: 'dispatch' })]);
      await settle();
      assert.equal(ctx.calls.length, 0);
      const hz = await (await fetch(ctx.base + '/healthz')).text();
      const body = JSON.parse(hz);
      assert.equal(body.arch1_launch.enabled, false);
      assert.equal(body.arch1_launch.cap, 3);
      assert.equal(body.arch1_launch.used, 0);
      assert.equal(body.arch1_launch.seat, 'arch1');
      assert.equal(body.arch1_launch.day, chicagoDay());
      assert.deepEqual(Object.keys(body.arch1_launch).sort(), ['cap', 'day', 'enabled', 'seat', 'used']);
      assertNoSecrets(hz);
      assertNoSecrets(ctx.logs.join(''));
    } finally { await ctx.stop(); }
  }
});

test('a nudge does not launch; a real packet does, once, and the prompt is clean', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0' });
  try {
    await postLines(ctx, [
      line({ id: 'nudge-1', type: 'nudge', reason: 'nudge L1 (stall)' }),
      line({ id: 'nudge-2', type: 'dispatch', reason: 'nudge the builder' }),
    ]);
    await settle(500);
    assert.equal(ctx.calls.length, 0);
    await postLines(ctx, [line({ id: 'go-1', seat: 'arch1', type: 'dispatch', number: 11 })]);
    await waitCalls(ctx, 1);
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].url, '/v0/agents');
    const prompt = ctx.calls[0].body.prompt.text;
    assert.match(prompt, /Read the inbox/);
    assert.match(prompt, /ack the line/);
    assert.equal(prompt.includes(KEY), false);
    assert.equal(prompt.includes(SECRET), false);
    assert.equal(ctx.calls[0].body.webhook.url, ctx.base + '/cursor/webhook');
    assert.equal(ctx.calls[0].body.webhook.secret, SECRET);
    assert.equal(ctx.calls[0].body.source.repository, 'https://github.com/0xRayAI/xray');
    assert.equal(ctx.calls[0].body.source.ref, 'main');
    assert.equal(ctx.calls[0].auth, 'Basic ' + Buffer.from(KEY + ':', 'utf8').toString('base64'));
    const got = await inbox(ctx);
    const stored = got.lines.filter(l => l.id === 'go-1');
    assert.equal(stored.length, 1);
    assert.equal(stored[0].seat, 'arch1');
    assertNoSecrets(ctx.logs.join(''));
  } finally { await ctx.stop(); }
});

test('a running head resumes that bc- id instead of launching another agent', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0' });
  try {
    const head = 'cd'.repeat(20);
    const posted = await fetch(ctx.base + '/activity', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ctx.seatKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        t_ct: new Date().toISOString(),
        kind: 'cloud_agent',
        action: 'launch',
        agent: 'bc-hookagent01',
        tag: head,
      }),
    });
    assert.equal(posted.status, 202, await posted.text());
    await postLines(ctx, [line({ id: 'resume-1', type: 'dispatch', number: 81, sha: head })]);
    await waitCalls(ctx, 1);
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].url, '/v0/agents/bc-hookagent01/followup');
    assertNoSecrets(ctx.logs.join(''));
  } finally { await ctx.stop(); }
});

test('one live agent per card: the next real packet is a follow-up', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0' });
  try {
    await postLines(ctx, [line({ id: 'a1', type: 'dispatch', number: 21 })]);
    await waitCalls(ctx, 1);
    await postLines(ctx, [line({ id: 'a2', type: 'ready', reason: 'merge-ready', number: 21 })]);
    await waitCalls(ctx, 2);
    assert.equal(ctx.calls.length, 2);
    assert.equal(ctx.calls[0].url, '/v0/agents');
    assert.equal(ctx.calls[1].url, '/v0/agents/' + ctx.calls[0].id + '/followup');
    await postLines(ctx, [line({ id: 'a3', type: 'ready', reason: 'merge-ready', number: 22 })]);
    await waitCalls(ctx, 3);
    assert.equal(ctx.calls[2].url, '/v0/agents');
    assert.notEqual(ctx.calls[2].id, ctx.calls[0].id);
  } finally { await ctx.stop(); }
});

test('a packet during the cooldown is sent when the cooldown ends, and other cards stay free', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '1' });
  try {
    await postLines(ctx, [line({ id: 'c1', type: 'dispatch', number: 31 })]);
    await waitCalls(ctx, 1);
    await postLines(ctx, [line({ id: 'c2', type: 'ready', reason: 'merge-ready', number: 31 })]);
    await settle(200);
    assert.equal(ctx.calls.length, 1);
    await postLines(ctx, [line({ id: 'c3', type: 'ready', reason: 'merge-ready', number: 32 })]);
    await waitCalls(ctx, 3, 4000);
    const creates = ctx.calls.filter(c => c.url === '/v0/agents');
    const followups = ctx.calls.filter(c => c.url.endsWith('/followup'));
    assert.equal(creates.length, 2);
    assert.equal(followups.length, 1);
    assert.equal(followups[0].url, '/v0/agents/' + ctx.calls[0].id + '/followup');
    assert.match(followups[0].body.prompt.text, /Line id: c2/);
  } finally { await ctx.stop(); }
});

function boardCard(number, owner) {
  return {
    key: '0xRayAI/xray#' + number, kind: 'pr', repo: '0xRayAI/xray', number, title: 'owned',
    url: 'https://github.com/0xRayAI/xray/pull/' + number,
    owner, stage: 'fix', state: 'live', last_beat_t: Date.now(),
  };
}

test('daily cap counts follow-ups and writes one visible beat', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0', ARCH1_LAUNCH_DAILY_CAP: '2' }, data => {
    writeCards(data, [boardCard(41, 'ARCH1')]);
  });
  try {
    await postLines(ctx, [line({ id: 'cap-1', type: 'dispatch', number: 41 })]);
    await waitCalls(ctx, 1);
    await postLines(ctx, [line({ id: 'cap-2', type: 'ready', reason: 'merge-ready', number: 41 })]);
    await waitCalls(ctx, 2);
    assert.equal(ctx.calls[1].url, '/v0/agents/' + ctx.calls[0].id + '/followup');
    await postLines(ctx, [line({ id: 'cap-3', type: 'critic_fail', reason: 'critic FAIL', number: 41 })]);
    await settle(500);
    assert.equal(ctx.calls.length, 2);
    const got = await inbox(ctx);
    const beats = got.lines.filter(l => l.reason === 'ARCH1 launch cap reached');
    assert.equal(beats.length, 1);
    assert.equal(beats[0].seat, 'arch1');
    assert.equal(beats[0].type, 'beat');
    await postLines(ctx, [line({ id: 'cap-4', type: 'dispatch', number: 41 })]);
    await settle(400);
    assert.equal((await inbox(ctx)).lines.filter(l => l.reason === 'ARCH1 launch cap reached').length, 1);
    const login = await fetch(ctx.base + '/login', { method: 'POST', body: 'password=' + ctx.pw, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const feed = await (await fetch(ctx.base + '/live-events.json', { headers: { Cookie: login.headers.get('set-cookie').split(';')[0] } })).json();
    assert.ok(got.lines.some(l => l.seat === 'arch1' && l.type === 'beat'));
    assert.ok(!feed.queue.some(l => l.type === 'beat'));
    const hz = await (await fetch(ctx.base + '/healthz')).json();
    assert.equal(hz.arch1_launch.used, 2);
    assert.equal(hz.arch1_launch.cap, 2);
    assertNoSecrets(JSON.stringify(hz));
    assertNoSecrets(ctx.logs.join(''));
  } finally { await ctx.stop(); }
});

test('webhook signature: bad is 401, FINISHED and ERROR beat once, other statuses do not', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0' });
  try {
    const payload = JSON.stringify({
      event: 'statusChange', timestamp: new Date().toISOString(), id: 'bc-agent0001', status: 'FINISHED',
      source: { repository: 'https://github.com/0xRayAI/xray' },
      target: { url: 'https://github.com/0xRayAI/xray/pull/9', branchName: 'cursor/x', prUrl: 'https://github.com/0xRayAI/xray/pull/9' },
      summary: 'landed the card',
    });
    const bad = await fetch(ctx.base + '/cursor/webhook', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign('wrong-secret-wrong-secret-wrong-32', payload), 'X-Webhook-ID': 'wh-1', 'X-Webhook-Event': 'statusChange' } });
    assert.equal(bad.status, 401);
    await settle(200);
    assert.equal((await inbox(ctx)).lines.filter(l => String(l.reason || '').includes('FINISHED')).length, 0);
    await postLines(ctx, [line({ id: 'wh-card', type: 'dispatch', number: 51 })]);
    await waitCalls(ctx, 1);
    const agent = ctx.calls[0].id;
    const finished = JSON.stringify({ event: 'statusChange', timestamp: new Date().toISOString(), id: agent, status: 'FINISHED', summary: 'landed the card', target: { url: 'https://github.com/0xRayAI/xray/pull/9' } });
    const headers = body => ({ 'Content-Type': 'application/json', 'X-Webhook-Signature': sign(SECRET, body), 'X-Webhook-ID': 'wh-fin', 'X-Webhook-Event': 'statusChange' });
    const ok = await fetch(ctx.base + '/cursor/webhook', { method: 'POST', body: finished, headers: headers(finished) });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true });
    await settle(300);
    const lines = (await inbox(ctx)).lines.filter(l => l.reason === 'ARCH1 cloud agent FINISHED');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'beat');
    assert.notEqual(lines[0].kind, 'run_end');
    const again = await fetch(ctx.base + '/cursor/webhook', { method: 'POST', body: finished, headers: headers(finished) });
    assert.equal(again.status, 200);
    assert.equal((await again.json()).duplicate, true);
    await settle(200);
    assert.equal((await inbox(ctx)).lines.filter(l => l.reason === 'ARCH1 cloud agent FINISHED').length, 1);
    const running = JSON.stringify({ event: 'statusChange', id: agent, status: 'RUNNING' });
    const mid = await fetch(ctx.base + '/cursor/webhook', { method: 'POST', body: running, headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign(SECRET, running), 'X-Webhook-ID': 'wh-run', 'X-Webhook-Event': 'statusChange' } });
    assert.equal(mid.status, 200);
    assert.equal((await inbox(ctx)).lines.filter(l => String(l.reason || '').includes('RUNNING')).length, 0);
    const errored = JSON.stringify({ event: 'statusChange', id: agent, status: 'ERROR', summary: 'boom' });
    const err = await fetch(ctx.base + '/cursor/webhook', { method: 'POST', body: errored, headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sign(SECRET, errored), 'X-Webhook-ID': 'wh-err', 'X-Webhook-Event': 'statusChange' } });
    assert.equal(err.status, 200);
    await settle(300);
    assert.equal((await inbox(ctx)).lines.filter(l => l.reason === 'ARCH1 cloud agent ERROR').length, 1);
    await postLines(ctx, [line({ id: 'wh-next', type: 'dispatch', number: 51 })]);
    await waitCalls(ctx, 2);
    assert.equal(ctx.calls[1].url, '/v0/agents');
    assertNoSecrets(ctx.logs.join(''));
  } finally { await ctx.stop(); }
});

test('startup copy of arch1 history does not launch and keeps the inbox file', async () => {
  const alias = { id: 'old-dispatch', t_ct: new Date().toISOString(), seat: 'arch1', type: 'dispatch', repo: '0xRayAI/xray', number: 3, sha: 'abc1234', title: 'already filed', url: 'https://github.com/0xRayAI/xray/issues/3', reason: 'new issue, next ARCH1' };
  const raw = JSON.stringify(alias) + '\n';
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0' }, data => {
    const dir = path.join(data, 'live', 'inbox');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'arch1.jsonl'), raw);
  });
  try {
    await settle(500);
    assert.equal(ctx.calls.length, 0);
    const file = path.join(ctx.data, 'live', 'inbox', 'arch1.jsonl');
    assert.equal(fs.readFileSync(file, 'utf8'), raw);
    const got = await inbox(ctx);
    assert.ok(got.lines.some(l => l.id === 'old-dispatch' && l.seat === 'arch1'));
    await postLines(ctx, [line({ id: 'after-boot', type: 'dispatch', number: 61 })]);
    await waitCalls(ctx, 1);
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].url, '/v0/agents');
    const after = fs.readFileSync(file, 'utf8');
    assert.ok(after.startsWith(raw));
    assert.ok(after.includes('after-boot'));
  } finally { await ctx.stop(); }
});

test('a Critic FAIL launches only when the board card is ARCH1-owned', async () => {
  const ctx = await boot({ ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '0', ARCH1_LAUNCH_DAILY_CAP: '1' }, data => {
    writeCards(data, [boardCard(71, 'Forge'), boardCard(72, 'Builder'), boardCard(73, 'ARCH1'), boardCard(74, 'Lead')]);
  });
  try {
    await postLines(ctx, [
      line({ id: 'own-forge', type: 'critic_fail', reason: 'critic FAIL', number: 71 }),
      line({ id: 'own-builder', type: 'critic_fail', reason: 'critic FAIL', number: 72 }),
      line({ id: 'own-missing', type: 'critic_fail', reason: 'critic FAIL', number: 70 }),
    ]);
    await settle(500);
    assert.equal(ctx.calls.length, 0);
    assert.equal((await (await fetch(ctx.base + '/healthz')).json()).arch1_launch.used, 0);
    await postLines(ctx, [line({ id: 'own-arch', type: 'critic_fail', reason: 'critic FAIL', number: 73 })]);
    await waitCalls(ctx, 1);
    assert.equal(ctx.calls.length, 1);
    assert.equal(ctx.calls[0].url, '/v0/agents');
    assert.equal((await (await fetch(ctx.base + '/healthz')).json()).arch1_launch.used, 1);
    await postLines(ctx, [line({ id: 'own-lead', type: 'critic_fail', reason: 'critic FAIL', number: 74 })]);
    await settle(400);
    assert.equal(ctx.calls.length, 1);
    assert.equal((await inbox(ctx)).lines.filter(l => l.reason === 'ARCH1 launch cap reached').length, 1);
  } finally { await ctx.stop(); }
});

function launchEnv(dir, extra = {}) {
  return {
    env: {
      ARCH1_LAUNCH_ENABLED: '1', ARCH1_LAUNCH_COOLDOWN_S: '1800', ARCH1_LAUNCH_DAILY_CAP: '3',
      CURSOR_API_KEY: 'cursor_test_key_not_a_real_secret', CURSOR_API_URL: 'http://cursor.test',
      CURSOR_WEBHOOK_SECRET: SECRET, ARCH1_CLOUD_REPO: REPO, ...extra,
    },
    dataDir: dir,
  };
}

test('advancing the clock sends the queued packet as one follow-up', async () => {
  let clock = 1_700_000_000_000;
  const calls = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-a1q-'));
  const launch = createArch1Launch({
    ...launchEnv(dir),
    now: () => clock,
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      const id = calls.length === 1 ? 'bc-agent-live' : 'bc-agent-next';
      return { ok: true, status: 200, text: async () => JSON.stringify({ id }) };
    },
  });
  try {
    await launch.consider(line({ id: 'q1', type: 'dispatch', number: 31 }));
    assert.equal(calls.length, 1);
    clock += 10 * 60 * 1000;
    await launch.consider(line({ id: 'q-old', type: 'ready', reason: 'merge-ready', number: 31 }));
    await launch.consider(line({ id: 'q-new', type: 'dispatch', number: 31 }));
    assert.equal(calls.length, 1);
    clock += 21 * 60 * 1000;
    await launch.pump();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'http://cursor.test/v0/agents/bc-agent-live/followup');
    assert.match(calls[1].body.prompt.text, /Line id: q-new/);
    assert.equal(calls[1].body.prompt.text.includes('q-old'), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a dead follow-up is cleared and the next attempt creates a new agent', async () => {
  const calls = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-a1d-'));
  let created = 0;
  const launch = createArch1Launch({
    ...launchEnv(dir, { ARCH1_LAUNCH_COOLDOWN_S: '0' }),
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (url.endsWith('/followup')) return { ok: false, status: url.includes('bc-dead0001') ? 404 : 0, text: async () => '' };
      created += 1;
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: created === 1 ? 'bc-dead0001' : 'bc-live0002' }) };
    },
  });
  try {
    await launch.consider(line({ id: 'd1', type: 'dispatch', number: 81 }));
    await launch.consider(line({ id: 'd2', type: 'ready', reason: 'merge-ready', number: 81 }));
    assert.deepEqual(calls.map(c => c.url), [
      'http://cursor.test/v0/agents',
      'http://cursor.test/v0/agents/bc-dead0001/followup',
      'http://cursor.test/v0/agents',
    ]);
    const timed = Buffer.from(JSON.stringify({ id: 'bc-live0002', status: 'TIMEOUT', summary: 'timed out' }));
    const result = launch.handleWebhook(timed, { 'x-webhook-signature': sign(SECRET, timed), 'x-webhook-id': 'wh-timeout' });
    assert.equal(result.status, 200);
    assert.equal(launch.cardBeats().some(b => b.what === 'ARCH1 cloud agent TIMEOUT'), true);
    await launch.consider(line({ id: 'd3', type: 'dispatch', number: 81 }));
    assert.equal(calls[3].url, 'http://cursor.test/v0/agents');
    assert.equal(calls.some(c => c.url.includes('bc-dead0001') && c !== calls[1]), false);
    assert.equal(launch.health().used, 3);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a Critic FAIL the board does not own never spends the cap', async () => {
  const calls = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-a1o-'));
  const launch = createArch1Launch({
    ...launchEnv(dir, { ARCH1_LAUNCH_COOLDOWN_S: '0', ARCH1_LAUNCH_DAILY_CAP: '2' }),
    ownsCard: row => row.number === 73,
    fetchImpl: async url => {
      calls.push(url);
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'bc-owned' + String(calls.length).padStart(4, '0') }) };
    },
  });
  try {
    await launch.consider(line({ id: 'o1', type: 'critic_fail', reason: 'critic FAIL', number: 71 }));
    assert.equal(calls.length, 0);
    assert.equal(launch.health().used, 0);
    await launch.consider(line({ id: 'o2', type: 'dispatch', number: 71 }));
    await launch.consider(line({ id: 'o3', type: 'critic_fail', reason: 'critic FAIL', number: 73 }));
    assert.deepEqual(calls, ['http://cursor.test/v0/agents', 'http://cursor.test/v0/agents']);
    assert.equal(launch.health().used, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
