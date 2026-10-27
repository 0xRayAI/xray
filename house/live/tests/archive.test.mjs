// Archive: project, reader, auth, restart dedupe, live-window prune.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initArchive, readArchive, project, validArchiveDate, appendArchive, appendTransition, cardHistory, loadedArchiveDays, archivedLineBytes, transitionFromEvent } from '../app/archive.mjs';
import { chicagoDay } from '../app/chicago-stamp.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

test('project strips body; truncated last line is skipped; a bad calendar date is rejected', () => {
  const row = project('events', {
    id: 'e1', t_ct: '2026-10-13T00:00:00Z', kind: 'push', label: 'ok',
    body: 'SENTINEL_BODY', secret: 'SENTINEL_SECRET', token: 't', password: 'p', authorization: 'a',
    message: 'm', text: 'x',
  });
  const packed = JSON.stringify(row);
  assert.equal(row.label, 'ok');
  assert.equal(row.body, undefined);
  assert.equal(row.secret, undefined);
  assert.ok(!packed.includes('SENTINEL_BODY') && !packed.includes('SENTINEL_SECRET'));

  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-'));
  initArchive(data);
  const day = '2026-10-13';
  const dir = path.join(data, 'archive', day);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'events.jsonl'), '{"id":"a","t_ct":"2026-10-13T00:00:00Z"}\n{"id":"trunc","t_ct":\n');
  const { lines } = readArchive(day, 'events');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].id, 'a');

  assert.equal(validArchiveDate('2026-02-31'), false);
  assert.equal(validArchiveDate('2026-13-01'), false);
  assert.equal(validArchiveDate('2026-02-29'), false);
  assert.equal(validArchiveDate('2024-02-29'), true);
  assert.equal(validArchiveDate('2026-1-01'), false);
  assert.equal(validArchiveDate('2026-10-13'), true);
  const activity = { id: 'e.1', seq: 1, seat: 'forge', t_ct: '2026-10-20T10:00:00-05:00', kind: 'prompt', action: 'sent', from: 'Ada', to: 'forge', note: 'fixed summary', room: 'ops' };
  assert.equal(project('activity', activity).note, undefined);
  assert.equal(archivedLineBytes('activity', activity), Buffer.byteLength(JSON.stringify(project('activity', activity)) + '\n'));
  assert.notEqual(archivedLineBytes('activity', activity), Buffer.byteLength(JSON.stringify(activity) + '\n'));
  fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

function start(data, extra = {}) {
  const ingest = extra.INGEST_SECRET || crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0',   // #304: the OS picks the port; read it from the listening line
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: ingest,
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  const baseOf = () => { const m = /listening on :(\d+)/.exec(logs); return m ? `http://127.0.0.1:${m[1]}` : null; };
  const ready = (async () => {
    for (let i = 0; i < 300; i++) {
      const base = baseOf();
      try { if (base && (await fetch(base + '/healthz')).ok) return; } catch { /* not up */ }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('healthz did not come up\n' + logs);
  })();
  return { child, get base() { return baseOf(); }, ready, ingest, logs: () => logs };
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

function archiveBytes(data) {
  const root = path.join(data, 'archive');
  if (!fs.existsSync(root)) return '';
  let out = '';
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out += fs.readFileSync(p);
    }
  };
  walk(root);
  return out;
}

test('unset ARCHIVE_KEY still boots and /archive is 401', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-'));
  const srv = start(data, { COLLECTOR: 'off' });
  try {
    await srv.ready;
    const health = await fetch(srv.base + '/healthz');
    assert.equal(health.status, 200);
    const arch = await fetch(srv.base + '/archive?date=2026-10-13&kind=events');
    assert.equal(arch.status, 401);
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});

test('401 without the key; 400 for a bad date or kind; archive survives restart; secrets stay out; a pruned inbox line remains', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-'));
  const key = crypto.randomBytes(16).toString('hex');
  const ghTime = new Date().toISOString();
  fs.mkdirSync(path.join(data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(data, 'feed', 'github-events.json'), JSON.stringify({
    generated_at: ghTime,
    events: [{ id: 'gh-seed', t_ct: ghTime, kind: 'push', label: 'seed', body: 'SENTINEL_BODY_GH', secret: 'SENTINEL_SECRET_GH' }],
  }));
  const env = { ARCHIVE_KEY: key, COLLECTOR: 'on' };
  let srv = start(data, env);
  const ingest = srv.ingest;
  try {
    await srv.ready;
    const open = await fetch(srv.base + '/archive?date=2026-10-13&kind=events');
    assert.equal(open.status, 401);
    const wrong = await fetch(srv.base + '/archive?date=2026-10-13&kind=events', { headers: { Authorization: 'Bearer nope' } });
    assert.equal(wrong.status, 401);
    const badDate = await fetch(srv.base + '/archive?date=2026-02-31&kind=events', { headers: { Authorization: 'Bearer ' + key } });
    assert.equal(badDate.status, 400);
    const badKind = await fetch(srv.base + '/archive?date=2026-10-13&kind=nope', { headers: { Authorization: 'Bearer ' + key } });
    assert.equal(badKind.status, 400);
    const missing = await fetch(srv.base + '/archive?date=2024-01-02&kind=events', { headers: { Authorization: 'Bearer ' + key } });
    assert.equal(missing.status, 200);
    assert.deepEqual((await missing.json()).lines, []);

    const boxTime = new Date().toISOString();
    const ing = await fetch(srv.base + '/ingest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ generated_at: boxTime, events: [{
        id: 'box-secret', t_ct: boxTime, kind: 'commit', label: 'hello',
        body: 'SENTINEL_BODY_BOX', secret: 'SENTINEL_SECRET_BOX', token: 'tok', password: 'pw', authorization: 'Bearer x',
      }] }),
    });
    assert.equal(ing.status, 200);

    const old = new Date(Date.now() - 8 * 86400000);
    const line = {
      id: 'old-line', t_ct: old.toISOString(), seat: 'builder', type: 'pr', repo: 'acme/one', number: 1,
      title: 'old', url: 'https://github.com/acme/one/pull/1', reason: 'aged out',
    };
    const posted = await fetch(srv.base + '/inbox/builder', {
      method: 'POST',
      headers: { 'X-Live-Ingest': ingest, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [line] }),
    });
    assert.equal(posted.status, 200, await posted.text());
    const livePath = path.join(data, 'live', 'inbox', 'builder.jsonl');
    const live = fs.existsSync(livePath) ? fs.readFileSync(livePath, 'utf8') : '';
    assert.ok(!live.includes('old-line'));
    const day = chicagoDay(old.toISOString());
    const kept = await (await fetch(srv.base + `/archive?date=${day}&kind=inbox`, { headers: { Authorization: 'Bearer ' + key } })).json();
    assert.ok(kept.lines.some(l => l.id === 'old-line'));
    assert.ok(!JSON.stringify(kept.lines).includes('body'));

    await stop(srv.child);
    srv = start(data, { ...env, INGEST_SECRET: ingest });
    await srv.ready;
    const again = await (await fetch(srv.base + `/archive?date=${chicagoDay(ghTime)}&kind=events`, {
      headers: { Authorization: 'Bearer ' + key },
    })).json();
    assert.equal(again.lines.filter(l => l.id === 'gh-seed').length, 1);
    const box = await (await fetch(srv.base + `/archive?date=${chicagoDay(boxTime)}&kind=events`, {
      headers: { Authorization: 'Bearer ' + key },
    })).json();
    assert.equal(box.lines.filter(l => l.id === 'box-secret').length, 1);
    const bytes = archiveBytes(data);
    assert.ok(!bytes.includes('SENTINEL_BODY_GH'), bytes);
    assert.ok(!bytes.includes('SENTINEL_SECRET_GH'));
    assert.ok(!bytes.includes('SENTINEL_BODY_BOX'));
    assert.ok(!bytes.includes('SENTINEL_SECRET_BOX'));
    assert.ok(fs.existsSync(path.join(data, 'archive', '.backfill-done')));
  } finally {
    await stop(srv.child);
    fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});

test('one inbox line id on two seats (builder + builder-cloud) archives both; a repeat per seat is deduped', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-2seat-'));
  initArchive(data);
  const line = { id: 'L1', t_ct: '2026-10-13T01:00:00Z', type: 'review', repo: 'o/r', number: 1 };
  assert.equal(appendArchive('inbox', { ...line, seat: 'builder' }), true);
  assert.equal(appendArchive('inbox', { ...line, seat: 'builder-cloud' }), true);
  assert.equal(appendArchive('inbox', { ...line, seat: 'builder' }), false);
  initArchive(data);   // restart: dedupe survives
  assert.equal(appendArchive('inbox', { ...line, seat: 'builder-cloud' }), false);
  const seats = readArchive('2026-10-12', 'inbox').lines.map(r => r.seat).sort();
  assert.deepEqual(seats, ['builder', 'builder-cloud']);
});

test('#290 startup loads only the newest days; an older day loads on first append and still dedupes', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-warm-'));
  const days = ['2026-09-01', '2026-10-01', '2026-10-12', '2026-10-13'];
  for (const d of days) {
    fs.mkdirSync(path.join(data, 'archive', d), { recursive: true });
    fs.writeFileSync(path.join(data, 'archive', d, 'events.jsonl'), JSON.stringify({ id: 'old-' + d, t_ct: d + 'T12:00:00Z' }) + '\n');
  }
  initArchive(data);
  assert.deepEqual(loadedArchiveDays(), ['2026-10-12', '2026-10-13']);
  assert.equal(appendArchive('events', { id: 'old-2026-09-01', t_ct: '2026-09-01T12:00:00Z' }), false);
  assert.deepEqual(loadedArchiveDays(), ['2026-09-01', '2026-10-12', '2026-10-13']);
  assert.equal(readArchive('2026-09-01', 'events').lines.length, 1);
});

test('a 19:00 CT event files on that Chicago day, and the same source appends once', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-ct-'));
  initArchive(data);
  const boundary = transitionFromEvent({
    id: 'edge-1900', kind: 'merged', repo: 'Example/Repo', number: 19,
    t_ct: '2026-10-21T00:00:00Z', title: 'nineteen', body: 'SENTINEL_BODY',
  });
  const half = transitionFromEvent({
    id: 'edge-1930', kind: 'merged', repo: 'Example/Repo', number: 19,
    t_ct: '2026-10-20T19:30:00-05:00', title: 'half', merged_by: 'forge',
  });
  assert.equal(boundary.t_ct, '2026-10-20T19:00:00-05:00');
  assert.equal(half.t_ct, '2026-10-20T19:30:00-05:00');
  assert.equal(appendTransition(boundary), true);
  assert.equal(appendTransition(boundary), false);
  assert.equal(appendTransition(half), true);
  assert.equal(appendArchive('events', { id: 'edge-ev', t_ct: '2026-10-21T00:00:00Z', kind: 'push' }), true);
  const file = path.join(data, 'archive', '2026-10-20', 'transitions.jsonl');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(fs.existsSync(path.join(data, 'archive', '2026-10-21', 'transitions.jsonl')), false);
  assert.ok(!fs.readFileSync(file, 'utf8').includes('SENTINEL_BODY'));
  assert.equal(readArchive('2026-10-20', 'events').lines.filter(row => row.id === 'edge-ev').length, 1);
  assert.equal(readArchive('2026-10-21', 'events').lines.length, 0);
  const index = path.join(data, 'archive', 'transition-index.json');
  const stamped = JSON.parse(fs.readFileSync(index, 'utf8'));
  fs.appendFileSync(file, JSON.stringify({
    id: 'example/repo#19|closed|other', card: 'example/repo#19', transition: 'closed', t_ct: '2026-10-20T21:00:00-05:00', source_id: 'other',
  }) + '\n');
  initArchive(data);
  assert.equal(cardHistory().cards.find(row => row.id === 'example/repo#19').verb, 'merged');
  fs.rmSync(index);
  initArchive(data);
  assert.equal(cardHistory().cards.find(row => row.id === 'example/repo#19').transition, undefined);
  assert.equal(cardHistory().cards.find(row => row.id === 'example/repo#19').verb, 'merged');
  assert.equal(stamped.ids.includes('example/repo#19|merged|edge-1900'), true);
  fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});

test('a day file larger than one read chunk still dedups', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-arch-'));
  const stamp = '2026-10-27T12:00:00-05:00';
  const day = chicagoDay(Date.parse(stamp));
  const dir = path.join(data, 'archive', day);
  fs.mkdirSync(dir, { recursive: true });
  const pad = 'x'.repeat(1000);
  const rows = [];
  for (let i = 0; i < 80; i += 1) {
    rows.push(JSON.stringify({ id: `id-${i}`, t_ct: stamp, kind: 'push', label: pad }));
  }
  fs.writeFileSync(path.join(dir, 'events.jsonl'), `${rows.join('\n')}\n`);
  initArchive(data);
  const again = appendArchive('events', { id: 'id-0', t_ct: stamp, kind: 'push', label: 'n' });
  assert.equal(again, false);
  const got = readArchive(day, 'events');
  assert.equal(got.lines.length, 80);
  assert.equal(got.lines[79].id, 'id-79');
  assert.equal(readArchive('2026-01-01', 'events').lines.length, 0);
  fs.rmSync(data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});
