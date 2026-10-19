// Routing seat ids come from inbox-roles.json (seats.coord.seat / seats.operator.seat).
// Defaults stay blinky / forge when the file does not name them. Served core clocks
// use an America/Chicago offset, never a bare Z.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const CT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-0[56]:00$/;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sign = (secret, body) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

const LEAD_KEY = 'lead-example-key';
const OPS_KEY = 'ops-example-key';
const FORGE_KEY = 'forge-example-key';
const BLINKY_KEY = 'blinky-example-key';
const CRITIC_KEY = 'critic-example-key';
const WEBHOOK = 'example-webhook-secret-32chars-min';
const INGEST = 'example-ingest-secret-example-org-1';

let child;
let base;
let data;
let route;
let logs = '';

function auth(key) {
  return { headers: { Authorization: 'Bearer ' + key } };
}

describe('core seat ids and served ct stamps', () => {
  before(async () => {
    data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-core-seat-'));
    route = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-core-route-'));
    fs.writeFileSync(path.join(route, 'inbox-roles.json'), JSON.stringify({
      seats: {
        coord: { seat: 'lead' },
        operator: { seat: 'ops' },
      },
    }));
    child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
      env: {
        PORT: '0',
        PATH: process.env.PATH,
        COLLECTOR: 'off',
        LIVE_PUBLIC: '1',
        SERVER_ROUTING: 'off',
        MESH_DATA_DIR: data,
        BIFROST_ROUTING_DIR: route,
        SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
        INGEST_SECRET: INGEST,
        CURSOR_WEBHOOK_SECRET: WEBHOOK,
        NUDGE_L1_S: '1',
        NUDGE_L2_S: '1',
        NUDGE_L3_S: '3600',
        LIVE_SEAT_IDS: 'lead,ops,critic,forge,blinky',
        SEAT_KEYS: JSON.stringify({
          lead: sha(LEAD_KEY),
          ops: sha(OPS_KEY),
          forge: sha(FORGE_KEY),
          blinky: sha(BLINKY_KEY),
          critic: sha(CRITIC_KEY),
        }),
        SEAT_AGENT_MAP: JSON.stringify({ 'bc-example0001': 'critic' }),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => { logs += d; });
    child.stderr.on('data', (d) => { logs += d; });
    const port = await listenPort(child);
    base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(base + '/healthz')).status) return; } catch { /* booting */ }
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('server did not boot: ' + logs.slice(-500));
  });

  after(async () => {
    if (child && child.exitCode == null) {
      const done = new Promise((r) => child.once('exit', r));
      child.kill();
      await done;
    }
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(route, { recursive: true, force: true });
  });

  test('T1 credit of from=coord is the routing coord seat', async () => {
    const posted = await fetch(base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'example',
        generated_at: '2026-10-14T15:00:00-05:00',
        events: [{
          id: 'ex-coord-1',
          t_ct: '2026-10-14T15:00:00-05:00',
          kind: 'pr_comment',
          repo: 'example-org/app',
          number: 7,
          from: 'coord',
          label: 'example note',
        }],
      }),
    });
    assert.equal(posted.status, 200, logs.slice(-400));
    const live = await (await fetch(base + '/live-events.json')).json();
    const ev = (live.events || []).find((row) => row.id === 'ex-coord-1');
    assert.ok(ev, 'event missing');
    assert.equal(ev.credit, 'lead');
  });

  test('T2 card L2 escalation uses the routing coord seat', async () => {
    const now = Date.now();
    const card = {
      key: 'example-org/app#11',
      kind: 'pr',
      repo: 'example-org/app',
      number: 11,
      title: 'example card',
      url: 'https://github.com/example-org/app/pull/11',
      owner: 'critic',
      stage: 'fix',
      state: 'live',
      packet: {},
      packet_ok: false,
      missing: [],
      beats: [{ t: now - 120000, what: 'pushed', url: '', id: 'b11' }],
      last_beat_t: now - 120000,
      stall: true,
    };
    const pushed = await fetch(base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'example',
        event_count: 0,
        generated_at: '2026-10-14T15:00:00-05:00',
        events: [],
        board: { updated_ct: '2026-10-14T15:00:00-05:00', cards: [card] },
      }),
    });
    assert.equal(pushed.status, 200, logs.slice(-400));
    await new Promise((r) => setTimeout(r, 1200));
    const body = await (await fetch(base + '/nudges', auth(OPS_KEY))).json();
    const l2 = (body.nudges || []).find((n) => n.card === 'example-org/app#11' && n.level === 2);
    assert.ok(l2, 'L2 nudge missing: ' + JSON.stringify(body.nudges || []).slice(0, 400));
    assert.equal(l2.seat, 'lead');
    assert.equal(l2.via, 'escalation');
  });

  test('T3 cards privileges follow the routing coord and operator seats', async () => {
    const read = (key, seat) => fetch(base + '/cards?seat=' + seat, auth(key));
    assert.equal((await read(LEAD_KEY, 'critic')).status, 200);
    assert.equal((await read(OPS_KEY, 'critic')).status, 200);
    assert.equal((await read(BLINKY_KEY, 'critic')).status, 403);
    assert.equal((await read(FORGE_KEY, 'critic')).status, 403);
    const all = await (await read(LEAD_KEY, 'lead')).json();
    assert.ok((all.cards || []).some((c) => c.number === 11));
  });

  test('T4 nudges are readable by the routing operator seat', async () => {
    assert.equal((await fetch(base + '/nudges', auth(OPS_KEY))).status, 200);
    assert.equal((await fetch(base + '/nudges', auth(FORGE_KEY))).status, 403);
    assert.equal((await fetch(base + '/nudges', auth(LEAD_KEY))).status, 403);
  });

  test('T5 served nudge and webhook clocks are Chicago offsets', async () => {
    const nudges = await (await fetch(base + '/nudges', auth(OPS_KEY))).json();
    const nudge = (nudges.nudges || []).find((n) => n.card === 'example-org/app#11');
    assert.ok(nudge, 'nudge missing');
    assert.match(nudge.t_ct, CT);
    assert.equal(nudge.t_ct.endsWith('Z'), false);

    const payload = {
      id: 'bc-example0001',
      status: 'RUNNING',
      metadata: { seat: 'critic' },
      target: { prUrl: 'https://github.com/example-org/app/pull/11' },
      summary: 'example agent',
    };
    const raw = Buffer.from(JSON.stringify(payload));
    const hooked = await fetch(base + '/cursor/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': sign(WEBHOOK, raw),
        'X-Webhook-Id': 'example-1',
      },
      body: raw,
    });
    assert.equal(hooked.status, 200, await hooked.clone().text());
    const live = await (await fetch(base + '/live-events.json')).json();
    const row = (live.cloud_agents || []).find((item) => item.bcId === 'bc-example0001');
    assert.ok(row, 'cloud agent missing');
    assert.match(row.updated_ct, CT);
    assert.equal(row.updated_ct.endsWith('Z'), false);
  });
});
