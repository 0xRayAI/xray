// A seat key may post one station reminder. A loose line stays refused. The line is not a packet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { listenPort } from './free-port.mjs';
import { realPacketKind } from '../app/arch1-launch.mjs';
import { isPacket } from '../app/worktrack.mjs';

const SENTENCE = 'Run station and re-read OP-PROC';

function stationLine(seat, hour, from) {
  return {
    id: `nudge:station:${seat}:${hour}`,
    t_ct: new Date().toISOString(),
    seat,
    from,
    to: seat,
    type: 'nudge',
    kind: 'station',
    repo: '',
    number: 0,
    title: SENTENCE,
    url: '',
    reason: SENTENCE,
  };
}

test('a station nudge is not a packet and does not launch', () => {
  const line = stationLine('forge', '2026-10-26T13', 'forge');
  assert.equal(realPacketKind(line), null);
  assert.equal(isPacket(line), false);
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs'), 'utf8');
  const gate = src.slice(src.indexOf('const ownStation'), src.indexOf('if (parsed && parsed.replace === true)'));
  assert.equal(gate.includes('deliverNudge'), false);
  assert.match(src, /function ensurePacketCard\(line\) \{\n  if \(!isPacket\(line\)\) return;/);
});

test('a seat key can post one station nudge and a loose line is refused', async () => {
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'station-nudge-'));
  const forgeKey = 'forge-key-' + crypto.randomBytes(6).toString('hex');
  const criticKey = 'critic-key-' + crypto.randomBytes(6).toString('hex');
  const archKey = 'arch-key-' + crypto.randomBytes(6).toString('hex');
  const keys = {
    forge: crypto.createHash('sha256').update(forgeKey).digest('hex'),
    critic: crypto.createHash('sha256').update(criticKey).digest('hex'),
    arch1: crypto.createHash('sha256').update(archKey).digest('hex'),
  };
  const srv = spawn(process.execPath, [path.join(app, 'server.mjs')], {
    env: {
      PORT: '0',
      MESH_PASSWORD: crypto.randomBytes(6).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(16).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(16).toString('hex'),
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      SERVER_ROUTING: 'off',
      STATION_NUDGE: 'off',
      SEAT_KEYS: JSON.stringify(keys),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const post = (key, line) => fetch('http://127.0.0.1:' + port + '/inbox', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines: [line] }),
  });
  let port = 0;
  try {
    port = await listenPort(srv);
    const own = stationLine('forge', '2026-10-26T13', 'forge');
    const posted = await post(forgeKey, own);
    assert.equal(posted.status, 200);
    assert.equal((await posted.json()).added, 1);
    const again = await post(forgeKey, own);
    assert.equal((await again.json()).added, 0);
    const cross = stationLine('critic', '2026-10-26T13', 'arch1');
    const crossed = await post(archKey, cross);
    assert.equal(crossed.status, 200);
    assert.equal((await crossed.json()).added, 1);
    const loose = { ...own, id: 'nudge:station:forge:2026-10-26T14', reason: 'do something else' };
    assert.equal((await post(forgeKey, loose)).status, 403);
    const packet = { ...own, id: 'nudge:station:forge:2026-10-26T15', type: 'packet' };
    assert.equal((await post(forgeKey, packet)).status, 403);
    const foreign = stationLine('forge', '2026-10-26T16', 'critic');
    assert.equal((await post(forgeKey, foreign)).status, 403);
    const seen = await (await fetch('http://127.0.0.1:' + port + '/inbox/forge?all=1', {
      headers: { Authorization: 'Bearer ' + forgeKey },
    })).json();
    const stored = (seen.lines || []).filter(line => String(line.id || '').startsWith('nudge:station:'));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].type, 'nudge');
    assert.equal(stored[0].kind, 'station');
    assert.equal(stored[0].reason, SENTENCE);
    const critic = await (await fetch('http://127.0.0.1:' + port + '/inbox/critic?all=1', {
      headers: { Authorization: 'Bearer ' + criticKey },
    })).json();
    const criticLine = (critic.lines || []).find(line => line.id === 'nudge:station:critic:2026-10-26T13');
    assert.equal(criticLine.from, 'arch1');
    assert.equal(criticLine.type, 'nudge');
    const sha = 'ab'.repeat(20);
    const handoff = {
      id: `handoff:0xrayai/xray#70:ready:${sha}`,
      t_ct: new Date().toISOString(),
      seat: 'critic',
      from: 'forge',
      to: 'critic',
      type: 'packet',
      kind: 'ready',
      repo: '0xRayAI/xray',
      number: 70,
      sha,
      title: 'handoff ready',
      url: 'https://github.com/0xRayAI/xray/pull/70',
      reason: 'handoff ready',
    };
    const handed = await post(forgeKey, handoff);
    assert.equal(handed.status, 200);
    assert.equal((await handed.json()).added, 1);
  } finally {
    srv.kill();
    await new Promise(resolve => srv.exitCode != null || srv.signalCode ? resolve() : srv.once('exit', resolve));
    fs.rmSync(data, { recursive: true, force: true });
  }
});
