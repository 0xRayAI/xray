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
  const password = 'pw-' + crypto.randomBytes(8).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', COLLECTOR: 'on', PATH: process.env.PATH, MESH_DATA_DIR: data,
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_PASSWORD: password,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  return { child, password, baseOf, logs: () => logs };
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

test('CI and pr_commit ahead of the card clock are not a stall', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-'));
  const cardAt = new Date(Date.now() - 400 * 1000).toISOString();
  const rawAt = new Date(Date.now() - 100 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [{ key: 'acme/one#4', repo: 'acme/one', number: 4, state: 'live', title: 't', stage: 'review', kind: 'pr' }],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: rawAt,
    events: [
      { id: 'open', t_ct: cardAt, kind: 'pr_open', repo: 'acme/one', number: 4 },
      { id: 'push', t_ct: rawAt, kind: 'pr_commit', repo: 'acme/one', number: 4, sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      { id: 'ci', t_ct: rawAt, kind: 'check_run', conclusion: 'success', repo: 'acme/one', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
  }));
  const srv = start(data);
  try {
    let health, live;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        health = await (await fetch(base + '/healthz')).json();
        if (typeof health.data_age === 'number') {
          const login = await fetch(base + '/login', {
            method: 'POST', redirect: 'manual',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'password=' + encodeURIComponent(srv.password),
          });
          const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
          live = await (await fetch(base + '/live-events.json', { headers: { Cookie: cookie } })).json();
          if (live.freshness && live.freshness.github_latest_ct) break;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    const gap = (Date.parse(live.freshness.github_latest_ct) - Date.parse(live.freshness.github_card_latest_ct)) / 1000;
    assert.ok(gap > 180, JSON.stringify(live.freshness));
    assert.equal(Date.parse(live.freshness.github_card_latest_ct), Date.parse(cardAt));
    assert.equal(health.cards_behind, false, JSON.stringify(health));
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a card-worthy event ahead of the card clock is a stall', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-'));
  const cardAt = new Date(Date.now() - 400 * 1000).toISOString();
  const openAt = new Date(Date.now() - 10 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [{ key: 'acme/one#4', repo: 'acme/one', number: 4, state: 'live', title: 't', stage: 'review', kind: 'pr' }],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: openAt,
    events: [
      { id: 'open-4', t_ct: cardAt, kind: 'pr_open', repo: 'acme/one', number: 4 },
      { id: 'open-9', t_ct: openAt, kind: 'pr_open', repo: 'acme/one', number: 9 },
    ],
  }));
  const srv = start(data);
  try {
    let health;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        health = await (await fetch(base + '/healthz')).json();
        if (typeof health.data_age === 'number') break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(health.cards_behind, true, JSON.stringify(health));
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('a card-worthy event on a closed card stays HTTP 200', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-closed-'));
  const cardAt = new Date(Date.now() - 400 * 1000).toISOString();
  const closedAt = new Date(Date.now() - 100 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [
      { key: 'acme/one#4', repo: 'acme/one', number: 4, state: 'live', title: 't', stage: 'review', kind: 'pr' },
      { key: 'acme/one#7', repo: 'acme/one', number: 7, state: 'closed', title: 'done', stage: 'done', kind: 'pr' },
    ],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: closedAt,
    events: [
      { id: 'open-4', t_ct: cardAt, kind: 'pr_open', repo: 'acme/one', number: 4 },
      { id: 'upd-7', t_ct: closedAt, kind: 'pr_update', repo: 'acme/one', number: 7 },
    ],
  }));
  const srv = start(data);
  try {
    let health, res;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        res = await fetch(base + '/healthz');
        health = await res.json();
        if (typeof health.data_age === 'number') break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(health.cards_behind, false, JSON.stringify(health));
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

test('a pr_open on a closed card stays HTTP 200', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-closedopen-'));
  const cardAt = new Date(Date.now() - 400 * 1000).toISOString();
  const closedAt = new Date(Date.now() - 100 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [
      { key: 'acme/one#4', repo: 'acme/one', number: 4, state: 'live', title: 't', stage: 'review', kind: 'pr' },
      { key: 'acme/one#7', repo: 'acme/one', number: 7, state: 'closed', title: 'done', stage: 'done', kind: 'pr' },
    ],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: closedAt,
    events: [
      { id: 'open-4', t_ct: cardAt, kind: 'pr_open', repo: 'acme/one', number: 4 },
      { id: 'open-7', t_ct: closedAt, kind: 'pr_open', repo: 'acme/one', number: 7 },
    ],
  }));
  const srv = start(data);
  try {
    let health, res;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        res = await fetch(base + '/healthz');
        health = await res.json();
        if (typeof health.data_age === 'number') break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(health.cards_behind, false, JSON.stringify(health));
    assert.equal(res.status, 200);
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('an issue reopen moves the card clock on a parked card', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-lag-reopen-'));
  const openedAt = new Date(Date.now() - 400 * 1000).toISOString();
  const reopenAt = new Date(Date.now() - 10 * 1000).toISOString();
  fs.mkdirSync(path.join(data, 'live'), { recursive: true });
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'live', 'cards.json'), JSON.stringify({
    updated_ct: new Date().toISOString(),
    cards: [{ key: 'example-org/app#12', repo: 'example-org/app', number: 12, state: 'parked', title: 'back', stage: 'open', kind: 'issue' }],
  }));
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: reopenAt,
    events: [
      { id: 'open-12', t_ct: openedAt, kind: 'issue_open', repo: 'example-org/app', number: 12 },
      { id: 'reopen-12', t_ct: reopenAt, kind: 'issue_reopen', repo: 'example-org/app', number: 12 },
    ],
  }));
  const srv = start(data);
  try {
    let health, live;
    for (let i = 0; i < 40; i++) {
      const base = srv.baseOf();
      if (base) {
        health = await (await fetch(base + '/healthz')).json();
        if (typeof health.data_age === 'number') {
          const login = await fetch(base + '/login', {
            method: 'POST', redirect: 'manual',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'password=' + encodeURIComponent(srv.password),
          });
          const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
          live = await (await fetch(base + '/live-events.json', { headers: { Cookie: cookie } })).json();
          if (live.freshness && live.freshness.github_card_latest_ct) break;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(Date.parse(live.freshness.github_card_latest_ct), Date.parse(reopenAt));
    assert.equal(health.cards_behind, false, JSON.stringify(health));
  } finally {
    const done = new Promise(r => srv.child.once('exit', r));
    srv.child.kill();
    await done;
    fs.rmSync(data, { recursive: true, force: true });
  }
});

test('card clock inside the lag window stays caught up', async () => {
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
