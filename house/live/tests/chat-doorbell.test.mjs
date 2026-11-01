// A critic ready/green head rings the chat. NOTES alone fails. The webhook path does not resume a cloud.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  cloudResumeUrl,
  criticHandoffAcceptance,
  criticHeads,
  loadChatDoorbells,
  postSeatMessage,
  seatMessage,
} from '../app/chat-doorbell.mjs';

const APP = fileURLToPath(new URL('../app/server.mjs', import.meta.url));
const SHA = '80b9bf3';
const CARD = '0xRayAI/xray#753';
const PR_URL = 'https://github.com/0xRayAI/xray/pull/753';

function line(over) {
  return {
    id: over.id,
    t_ct: '2026-10-30T17:00:00-05:00',
    seat: 'critic',
    type: 'packet',
    kind: 'ready',
    repo: '0xRayAI/xray',
    number: 753,
    sha: SHA,
    title: 'handoff ready',
    url: PR_URL,
    reason: 'handoff ready',
    from: 'forge',
    to: 'critic',
    ...over,
  };
}

const FIXTURE = [
  line({ id: 'handoff:0xrayai/xray#753:ready:80b9bf3' }),
  line({
    id: 'pr:0xRayAI/xray#753@80b9bf3',
    type: 'pr_update',
    kind: 'pr_update',
    title: 'pushed',
    reason: 'new head',
  }),
];
const NOTES = 'Next for critic chat';

test('notes plus the #753 head and no seat message fails; a doorbell passes', () => {
  const bare = criticHandoffAcceptance({ notes: NOTES, lines: FIXTURE });
  assert.equal(bare.ok, false);
  assert.equal(bare.reason, 'notes-only');
  const heads = criticHeads(FIXTURE, 'critic');
  assert.equal(heads.length, 1);
  assert.equal(heads[0].kind, 'ready');
  assert.equal(criticHeads([FIXTURE[1]], 'critic').length, 0);
  const message = seatMessage(heads[0]);
  assert.equal(message.kind, 'seat_message');
  assert.equal(message.card, CARD);
  assert.match(message.note, /SendToAgent critic: handoff ready 0xRayAI\/xray#753 @80b9bf3/);
  assert.match(message.note, /resume critic_bc/);
  assert.equal(message.note.includes('followup'), false);
  assert.equal(message.note.includes('/v0/agents'), false);
  const rung = criticHandoffAcceptance({ notes: NOTES, lines: FIXTURE, doorbells: [message] });
  assert.equal(rung.ok, true);
  assert.equal(rung.reason, 'doorbell');
  const src = fs.readFileSync(new URL('../app/chat-doorbell.mjs', import.meta.url), 'utf8');
  assert.equal(src.includes('arch1-launch'), false);
  assert.equal(src.includes('createArch1Launch'), false);
});

test('a cloud resume URL is refused and not fetched', async () => {
  assert.equal(cloudResumeUrl('https://api.cursor.com/v0/agents/bc-043681df/followup'), true);
  const calls = [];
  const cfg = { url: 'https://api.cursor.com/v0/agents/bc-043681df/followup', keyEnv: 'CHAT_KEY_CRITIC', bearer: true };
  const result = await postSeatMessage(cfg, seatMessage(FIXTURE[0]), { CHAT_KEY_CRITIC: 'k' }, async (url) => {
    calls.push(url);
    return { ok: true, status: 200 };
  });
  assert.equal(result.error, 'cloud_resume_refused');
  assert.equal(calls.length, 0);
  const loaded = loadChatDoorbells({
    SEAT_CHAT_DOORBELL: JSON.stringify({ critic: { url: 'https://api.cursor.com/v0/agents/bc-043681df/followup' } }),
  }, ['critic']);
  assert.equal(loaded.critic, undefined);
});

test('the webhook path rings the critic chat and does not resume a cloud', async () => {
  const hits = [];
  const sockets = new Set();
  const mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      hits.push({ path: req.url, body: raw });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  mock.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  const port = mock.address().port;
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-door-'));
  const secret = crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [APP], {
    env: {
      PORT: '0',
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      INGEST_SECRET: secret,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
      COLLECTOR: 'off',
      GITHUB_API_URL: 'http://127.0.0.1:1',
      SEAT_WEBHOOKS: JSON.stringify({ critic: { url: `http://127.0.0.1:${port}/wake`, key_env: 'WAKE_KEY_CRITIC' } }),
      SEAT_CHAT_DOORBELL: JSON.stringify({ critic: { url: `http://127.0.0.1:${port}/chat`, key_env: 'CHAT_KEY_CRITIC' } }),
      WAKE_KEY_CRITIC: 'wake-key',
      CHAT_KEY_CRITIC: 'chat-key',
      WAKE_DEBOUNCE_S: '0',
      WAKE_COALESCE_MS: '20',
      WAKE_STAGGER_MS: '0',
      WAKE_KIND_COOLDOWN_S: '0',
      WAKE_MAX_PER_HOUR: '100',
      LIVE_TURN_OPEN_MIN: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  const stop = async () => {
    if (child.exitCode == null && !child.signalCode) {
      const done = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGTERM');
      await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 2000))]);
      if (child.exitCode == null) child.kill('SIGKILL');
    }
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => mock.close(() => resolve()));
    fs.rmSync(data, { recursive: true, force: true });
  };
  try {
    let base = '';
    for (let i = 0; i < 80 && !base; i++) {
      const match = /listening on :(\d+)/.exec(logs);
      if (match) base = `http://127.0.0.1:${match[1]}`;
      else await new Promise((resolve) => setTimeout(resolve, 40));
    }
    assert.ok(base, logs.slice(-500));
    const posted = await fetch(base + '/inbox', {
      method: 'POST',
      headers: { 'X-Live-Ingest': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: FIXTURE }),
    });
    const postedText = await posted.text();
    assert.equal(posted.status, 200, postedText);
    let chat = null;
    for (let i = 0; i < 80 && !chat; i++) {
      chat = hits.find((hit) => hit.path === '/chat');
      if (!chat) await new Promise((resolve) => setTimeout(resolve, 40));
    }
    assert.ok(chat, logs.slice(-800) + '\n' + JSON.stringify(hits));
    assert.ok(hits.some((hit) => hit.path === '/wake'), 'inbox webhook still fires');
    const body = JSON.parse(chat.body);
    assert.equal(body.kind, 'seat_message');
    assert.equal(body.seat, 'critic');
    assert.equal(body.card, CARD);
    assert.equal(body.sha, SHA);
    assert.match(body.note, /SendToAgent critic:/);
    assert.match(body.note, /resume critic_bc/);
    assert.equal(JSON.stringify(hits).includes('/v0/agents'), false);
    assert.equal(JSON.stringify(hits).includes('followup'), false);
    assert.equal(hits.filter((hit) => hit.path === '/chat').length, 1);
    const rows = fs.readFileSync(path.join(data, 'live', 'chat-doorbell.jsonl'), 'utf8').trim().split('\n').map((row) => JSON.parse(row));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ok, true);
    assert.equal(rows[0].card, CARD);
    assert.match(logs, /doorbell: critic ok 0xRayAI\/xray#753/);
    const accepted = criticHandoffAcceptance({ notes: NOTES, lines: FIXTURE, doorbells: rows });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.reason, 'doorbell');
  } finally {
    await stop();
  }
});
