// Archive: project, reader, auth, restart dedupe, live-window prune.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initArchive, readArchive, project, validArchiveDate, appendArchive, loadedArchiveDays } from '../app/archive.mjs';

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
  fs.rmSync(data, { recursive: true, force: true });
});

function start(data, extra = {}) {
  const port = 21000 + Math.floor(Math.random() * 20000);
  const ingest = extra.INGEST_SECRET || crypto.randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: String(port),
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
  const base = `http://127.0.0.1:${port}`;
  const ready = (async () => {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(base + '/healthz')).ok) return; } catch { /* not up */ }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('healthz did not come up\n' + logs);
  })();
  return { child, base, ready, ingest, logs: () => logs };
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
    fs.rmSync(data, { recursive: true, force: true });
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
    const day = old.toISOString().slice(0, 10);
    const kept = await (await fetch(srv.base + `/archive?date=${day}&kind=inbox`, { headers: { Authorization: 'Bearer ' + key } })).json();
    assert.ok(kept.lines.some(l => l.id === 'old-line'));
    assert.ok(!JSON.stringify(kept.lines).includes('body'));

    await stop(srv.child);
    srv = start(data, { ...env, INGEST_SECRET: ingest });
    await srv.ready;
    const again = await (await fetch(srv.base + `/archive?date=${ghTime.slice(0, 10)}&kind=events`, {
      headers: { Authorization: 'Bearer ' + key },
    })).json();
    assert.equal(again.lines.filter(l => l.id === 'gh-seed').length, 1);
    const box = await (await fetch(srv.base + `/archive?date=${boxTime.slice(0, 10)}&kind=events`, {
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
    fs.rmSync(data, { recursive: true, force: true });
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
  const seats = readArchive('2026-10-13', 'inbox').lines.map(r => r.seat).sort();
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
