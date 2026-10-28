// Card fold, Redis history, and the page retry. The duplicate dump is not what Redis stores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initArchive, readArchive, appendArchive, cardHistory, adoptFoldedCards } from '../app/archive.mjs';
import { connectRedis, parseRedisUrl, readReply } from '../app/resp.mjs';
import { createHistory } from '../app/history-store.mjs';
import { compactOversized } from '../app/compact-cards.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

function bulk(value) {
  const body = Buffer.from(String(value));
  return Buffer.concat([Buffer.from(`$${body.length}\r\n`), body, Buffer.from('\r\n')]);
}

function startFake() {
  const hashes = new Map();
  const strings = new Map();
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      for (;;) {
        const parsed = readReply(buf, 0);
        if (!parsed) break;
        buf = buf.subarray(parsed.next);
        const args = (parsed.value.arr || []).map((part) => part.bulk);
        socket.write(reply(args));
      }
    });
  });
  function reply(args) {
    const cmd = String(args[0] || '').toUpperCase();
    if (cmd === 'PING' || cmd === 'AUTH' || cmd === 'SELECT') return Buffer.from('+OK\r\n');
    if (cmd === 'PING') return Buffer.from('+PONG\r\n');
    if (cmd === 'SET') { strings.set(args[1], args[2]); return Buffer.from('+OK\r\n'); }
    if (cmd === 'GET') return strings.has(args[1]) ? bulk(strings.get(args[1])) : Buffer.from('$-1\r\n');
    if (cmd === 'EXISTS') return Buffer.from(strings.has(args[1]) || hashes.has(args[1]) ? ':1\r\n' : ':0\r\n');
    if (cmd === 'HSET') {
      let hash = hashes.get(args[1]);
      if (!hash) { hash = new Map(); hashes.set(args[1], hash); }
      let added = 0;
      for (let i = 2; i + 1 < args.length; i += 2) {
        if (!hash.has(args[i])) added += 1;
        hash.set(args[i], args[i + 1]);
      }
      return Buffer.from(`:${added}\r\n`);
    }
    if (cmd === 'HGET') {
      const value = hashes.get(args[1]) && hashes.get(args[1]).get(args[2]);
      return value == null ? Buffer.from('$-1\r\n') : bulk(value);
    }
    if (cmd === 'HGETALL') {
      const hash = hashes.get(args[1]) || new Map();
      const parts = [Buffer.from(`*${hash.size * 2}\r\n`)];
      for (const [field, value] of hash) parts.push(bulk(field), bulk(value));
      return Buffer.concat(parts);
    }
    return Buffer.from('-ERR unknown\r\n');
  }
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port, server, strings, hashes,
        url: `redis://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

test('parseRedisUrl keeps the password out of the thrown message', () => {
  const parsed = parseRedisUrl('rediss://default:s%3Aecret@redis.internal:6380/2');
  assert.equal(parsed.tls, true);
  assert.equal(parsed.username, 'default');
  assert.equal(parsed.password, 's:ecret');
  assert.equal(parsed.host, 'redis.internal');
  assert.equal(parsed.port, 6380);
  assert.equal(parsed.db, 2);
  assert.throws(() => parseRedisUrl('http://redis.internal'), /redis url/);
});

test('redis keeps the latest card and one day of events', async () => {
  const fake = await startFake();
  try {
    const client = await connectRedis(fake.url);
    const store = createHistory(client);
    await store.putCard({
      key: 'Example/Repo#1', state: 'live', stage: 'open', title: 'Open',
      t_ct: '2026-10-01T00:00:00-05:00', updated_ct: '2026-10-01T00:00:00-05:00',
    });
    await store.putCard({
      key: 'example/repo#1', state: 'closed', stage: 'done', verb: 'merged', title: 'Shut',
      t_ct: '2026-10-27T00:00:00-05:00', updated_ct: '2026-10-27T00:00:00-05:00',
    });
    const cards = await store.readCards();
    assert.equal(cards.length, 1);
    assert.equal(cards[0].title, 'Shut');
    assert.equal(cards[0].verb, 'merged');
    assert.equal(cards[0].t_ct, '2026-10-01T00:00:00-05:00');
    await store.replaceEvents('2026-06-05', [
      { id: 'b', t_ct: '2026-06-05T02:00:00-05:00', kind: 'issue_open' },
      { id: 'a', t_ct: '2026-06-05T01:00:00-05:00', kind: 'pr_open' },
    ]);
    const events = await store.readEvents('2026-06-05');
    assert.deepEqual(events.map((row) => row.id), ['a', 'b']);
    assert.equal(await store.readEvents('2026-06-06'), null);
    await store.markReady({ cards: 1, days: 1 });
    assert.equal(JSON.parse(fake.strings.get('mesh:history-ready')).cards, 1);
    client.close();
  } finally {
    await fake.close();
  }
});

test('an oversized card dump folds to one row and the tail written during the scan wins', () => {
  const prev = process.env.MESH_CARDS_READ_MAX;
  process.env.MESH_CARDS_READ_MAX = '1024';
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-fold-'));
  try {
    const day = '2026-10-27';
    const dir = path.join(data, 'archive', day);
    fs.mkdirSync(dir, { recursive: true });
    const early = {
      id: 'example/repo#1|open|1', key: 'example/repo#1', state: 'live', stage: 'open',
      t_ct: '2026-10-27T00:00:00-05:00', updated_ct: '2026-10-27T00:00:00-05:00', title: 'Opened',
    };
    const mid = {
      id: 'example/repo#1|live|2', key: 'example/repo#1', state: 'live', stage: 'open',
      t_ct: '2026-10-27T01:00:00-05:00', updated_ct: '2026-10-27T01:00:00-05:00', title: 'JUNK',
    };
    const latest = {
      id: 'example/repo#1|done|closed|3', key: 'example/repo#1', state: 'closed', stage: 'done', verb: 'merged',
      t_ct: '2026-10-27T02:00:00-05:00', updated_ct: '2026-10-27T09:00:00-05:00', title: 'Kept',
    };
    let body = JSON.stringify(early) + '\n';
    const junk = JSON.stringify(mid) + '\n';
    while (Buffer.byteLength(body) < 2048) body += junk;
    body += JSON.stringify(latest) + '\n';
    fs.writeFileSync(path.join(dir, 'cards.jsonl'), body);
    fs.writeFileSync(path.join(dir, 'cards-tail.jsonl'), JSON.stringify({
      id: 'example/repo#1|done|closed|tail', key: 'example/repo#1', state: 'closed', stage: 'done', verb: 'merged',
      t_ct: '2026-10-27T03:00:00-05:00', updated_ct: '2026-10-27T12:00:00-05:00', title: 'From tail',
    }) + '\n');
    initArchive(data);
    assert.equal(readArchive(day, 'cards').lines.length, 1);
    assert.equal(readArchive(day, 'cards').lines[0].title, 'From tail');
    assert.equal(compactOversized(path.join(data, 'archive')), 1);
    assert.ok(adoptFoldedCards() >= 1);
    assert.equal(fs.existsSync(path.join(dir, 'cards.jsonl')), false);
    const folded = readArchive(day, 'cards').lines;
    assert.equal(folded.length, 1);
    assert.equal(folded[0].title, 'From tail');
    assert.equal(folded[0].t_ct, '2026-10-27T00:00:00-05:00');
    assert.equal(folded[0].updated_ct, '2026-10-27T12:00:00-05:00');
    assert.equal(appendArchive('cards', {
      key: 'example/repo#2', state: 'live', stage: 'open', title: 'New',
      t_ct: '2026-10-27T13:00:00-05:00', updated_ct: '2026-10-27T13:00:00-05:00',
    }), true);
    const after = readArchive(day, 'cards').lines;
    assert.ok(after.some((row) => row.title === 'From tail'));
    assert.ok(after.some((row) => row.key === 'example/repo#2'));
    const card = cardHistory().cards.find((row) => row.id.toLowerCase() === 'example/repo#1');
    assert.equal(card.verb, 'merged');
    assert.equal(card.opened_ct, '2026-10-27T00:00:00-05:00');
    assert.ok(!after.some((row) => row.title === 'JUNK'));
  } finally {
    if (prev == null) delete process.env.MESH_CARDS_READ_MAX;
    else process.env.MESH_CARDS_READ_MAX = prev;
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});

test('a tail-only card day keeps the folded row and does not write it again', () => {
  const prev = process.env.MESH_CARDS_READ_MAX;
  process.env.MESH_CARDS_READ_MAX = '1024';
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-tail-only-'));
  try {
    const dir = path.join(data, 'archive', '2026-10-27');
    fs.mkdirSync(dir, { recursive: true });
    const row = {
      id: 'example/repo#1|done|closed|2026-10-27T12:00:00-05:00',
      key: 'example/repo#1', stage: 'done', state: 'closed', verb: 'merged', title: 'Kept',
      t_ct: '2026-10-27T00:00:00-05:00', updated_ct: '2026-10-27T12:00:00-05:00',
    };
    fs.writeFileSync(path.join(dir, 'cards-tail.jsonl'), JSON.stringify(row) + '\n');
    initArchive(data);
    assert.equal(appendArchive('cards', row), false);
    const lines = readArchive('2026-10-27', 'cards').lines;
    assert.equal(lines.length, 1);
    assert.equal(lines[0].title, 'Kept');
    const card = cardHistory().cards.find((item) => item.id.toLowerCase() === 'example/repo#1');
    assert.equal(card.verb, 'merged');
    assert.equal(card.opened_ct, '2026-10-27T00:00:00-05:00');
  } finally {
    if (prev == null) delete process.env.MESH_CARDS_READ_MAX;
    else process.env.MESH_CARDS_READ_MAX = prev;
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});

test('the page asks again until card history is ready', () => {
  const page = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');
  assert.match(page, /b\.ready === false/);
  assert.match(page, /loadCardHist\(n \+ 1\)/);
  assert.match(page, /\/history\/cards\?limit=1000/);
  assert.match(page, /b\.next/);
});

test('a booted board loads planted history into redis', async () => {
  const fake = await startFake();
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-redis-boot-'));
  fs.mkdirSync(path.join(data, 'archive', '2026-06-05'), { recursive: true });
  fs.mkdirSync(path.join(data, 'archive', '2026-10-27'), { recursive: true });
  fs.writeFileSync(path.join(data, 'archive', '2026-06-05', 'events.jsonl'), JSON.stringify({
    id: 'june-1', t_ct: '2026-06-05T17:13:45-05:00', kind: 'issue_open', repo: 'example/repo', number: 1,
  }) + '\n');
  fs.writeFileSync(path.join(data, 'archive', '2026-10-27', 'cards.jsonl'), JSON.stringify({
    id: 'example/repo#9|live|1', key: 'example/repo#9', state: 'live', stage: 'open', title: 'Nine',
    t_ct: '2026-10-27T01:00:00-05:00', updated_ct: '2026-10-27T01:00:00-05:00',
  }) + '\n');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0',
      COLLECTOR: 'off',
      LIVE_PUBLIC: '1',
      PATH: process.env.PATH,
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      MESH_DATA_DIR: data,
      REDIS_URL: fake.url,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (buf) => { logs += buf; });
  child.stderr.on('data', (buf) => { logs += buf; });
  try {
    let base = '';
    for (let i = 0; i < 50; i += 1) {
      const match = /listening on :(\d+)/.exec(logs);
      if (match) { base = `http://127.0.0.1:${match[1]}`; break; }
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(base, logs);
    let body = null;
    for (let i = 0; i < 40; i += 1) {
      body = await (await fetch(base + '/healthz')).json();
      if (body.history_ready && body.history_redis === 'up' && body.history_cards >= 1) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    assert.equal(body.history_ready, true, logs);
    assert.equal(body.history_redis, 'up', logs);
    assert.equal(body.history_cards, 1, logs);
    const cards = JSON.parse(fake.hashes.get('mesh:cards').get('example/repo#9'));
    assert.equal(cards.title, 'Nine');
    const event = JSON.parse(fake.hashes.get('mesh:events:2026-06-05').get('june-1'));
    assert.equal(event.kind, 'issue_open');
    const days = await (await fetch(base + '/history')).json();
    assert.ok(days.days.includes('2026-06-05'));
    const day = await (await fetch(base + '/history?date=2026-06-05')).json();
    assert.equal(day.events.length, 1);
    assert.equal(day.events[0].id, 'june-1');
  } finally {
    if (child.exitCode == null) {
      const done = new Promise((r) => child.once('exit', r));
      child.kill();
      await done;
    }
    await fake.close();
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});
