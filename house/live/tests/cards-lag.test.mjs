// cards_behind follows card-worthy events. A newer CI check is not a stall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

function start(data) {
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'on', PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(8).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  return { child, baseOf, logs: () => logs };
}

function lay(agoCard, agoIngest) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-'));
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [{ key: 'acme/one#4', repo: 'acme/one', number: 4, state: 'live', title: 't', stage: 'review', kind: 'pr' }],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    events: [
      { id: 'open', t_ct: new Date(Date.now() - agoCard).toISOString(), kind: 'pr_open', repo: 'acme/one', number: 4 },
      { id: 'ingest', t_ct: new Date(Date.now() - agoIngest).toISOString(), kind: 'check_run', conclusion: 'success', repo: 'acme/one', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
  }));
  return data;
}

test('a CI check 19 min after the card event leaves cards_behind false', async () => {
  const data = lay(21 * 60 * 1000, 2 * 60 * 1000);
  const srv = start(data);
  try {
    let body, res;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        res = await fetch(base + '/healthz');
        body = await res.json();
        if (typeof body.data_age === 'number') break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(body.cards_behind, false, JSON.stringify(body));
    assert.equal(res.status, 200);
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('card clock within the threshold stays caught up', async () => {
  const data = lay(4 * 60 * 1000, 2 * 60 * 1000);
  const srv = start(data);
  try {
    let body;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        body = await (await fetch(base + '/healthz')).json();
        if (typeof body.data_age === 'number') break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(body.cards_behind, false, JSON.stringify(body));
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});
