// The board tick posts one station nudge per seat on the weekday half hour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { listenPort } from './free-port.mjs';
import { keepStoredStartAfter, chicagoStamp } from '../app/chicago-stamp.mjs';
import { parseOwnerClock, stationDue, stationHourKey, stationLines, stationSeats, STATION_SENTENCE } from '../app/station-tick.mjs';

const IDS = ['builder', 'builder-cloud', 'arch1', 'forge', 'critic', 'blinky', 'herald'];
const OPEN = '2026-11-06T07:30:00-06:00';

test('the half hour is the only open weekday slot', () => {
  assert.equal(stationHourKey('2026-10-26T07:29:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-26T07:30:00-05:00'), '2026-10-26T07');
  assert.equal(stationHourKey('2026-10-26T08:00:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-26T08:29:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-26T08:30:00-05:00'), '2026-10-26T08');
  assert.equal(stationHourKey('2026-10-26T13:00:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-26T17:30:00-05:00'), '2026-10-26T17');
  assert.equal(stationHourKey('2026-10-26T17:59:00-05:00'), '2026-10-26T17');
  assert.equal(stationHourKey('2026-10-26T18:00:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-25T13:30:00-05:00'), null);
  assert.equal(stationHourKey('2026-10-24T13:30:00-05:00'), null);
});

test('arch1 is included only when that id is in the list', () => {
  assert.deepEqual(stationSeats(['forge', 'critic', 'blinky', 'herald']), ['forge', 'critic', 'blinky']);
  assert.deepEqual(stationSeats(IDS), ['forge', 'critic', 'blinky', 'arch1']);
  assert.deepEqual(stationSeats(['critic', 'arch1']), ['critic', 'arch1']);
  assert.deepEqual(stationSeats(['herald']), []);
});

test('a due hour posts the sentence once', () => {
  const due = stationDue(OPEN, '', IDS);
  assert.equal(due.hour, '2026-11-06T07');
  assert.deepEqual(due.lines.map((line) => line.seat), ['forge', 'critic', 'blinky', 'arch1']);
  for (const line of due.lines) {
    assert.equal(line.id, `nudge:station:${line.seat}:2026-11-06T07`);
    assert.equal(line.type, 'nudge');
    assert.equal(line.kind, 'station');
    assert.equal(line.from, line.seat);
    assert.equal(line.to, line.seat);
    assert.equal(line.repo, '');
    assert.equal(line.url, '');
    assert.equal(line.number, 0);
    assert.equal(line.title, STATION_SENTENCE);
    assert.equal(line.reason, STATION_SENTENCE);
    assert.match(line.id, /^nudge:station:([a-z0-9-]{2,16}):(\d{4}-\d{2}-\d{2}T\d{2})$/);
  }
  assert.equal(stationDue(OPEN, due.hour, IDS), null);
  assert.equal(stationDue('2026-10-26T07:29:00-05:00', '', IDS), null);
  const again = stationLines(due.hour, ['forge'], OPEN);
  assert.equal(again[0].reason, STATION_SENTENCE);
});

test('the server tick is the board path and the station gate does not deliver a nudge', () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'server.mjs'), 'utf8');
  assert.match(src, /import \{ loadOwnerClock, stationDue \} from '\.\/station-tick\.mjs'/);
  assert.match(src, /flag === 'off'/);
  assert.match(src, /RAILWAY_ENVIRONMENT/);
  assert.match(src, /function stationTick\(now = new Date\(\)\)/);
  const gate = src.slice(src.indexOf('const ownStation'), src.indexOf('if (parsed && parsed.replace === true)'));
  assert.equal(gate.includes('deliverNudge'), false);
});

function spawnBoard(envExtra) {
  const app = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'station-tick-'));
  const seats = ['forge', 'critic', 'blinky', 'arch1'];
  const keys = {};
  const raw = {};
  for (const seat of seats) {
    raw[seat] = seat + '-key-' + crypto.randomBytes(6).toString('hex');
    keys[seat] = crypto.createHash('sha256').update(raw[seat]).digest('hex');
  }
  const srv = spawn(process.execPath, [path.join(app, 'server.mjs')], {
    env: {
      PORT: '0',
      MESH_PASSWORD: crypto.randomBytes(6).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(16).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(16).toString('hex'),
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      SERVER_ROUTING: 'off',
      SEAT_KEYS: JSON.stringify(keys),
      STATION_NUDGE: 'on',
      ...envExtra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { srv, data, raw };
}

async function stop(srv, data) {
  srv.kill();
  await new Promise((resolve) => (srv.exitCode != null || srv.signalCode ? resolve() : srv.once('exit', resolve)));
  fs.rmSync(data, { recursive: true, force: true });
}

test('a board boot inside the half hour posts one line per seat', async () => {
  const { srv, data, raw } = spawnBoard({ STATION_NOW: OPEN });
  try {
    const port = await listenPort(srv);
    for (const seat of ['forge', 'critic', 'blinky', 'arch1']) {
      const seen = await (await fetch('http://127.0.0.1:' + port + '/inbox/' + seat + '?all=1', {
        headers: { Authorization: 'Bearer ' + raw[seat] },
      })).json();
      const stored = (seen.lines || []).filter((line) => String(line.id || '').startsWith('nudge:station:'));
      assert.equal(stored.length, 1, seat);
      assert.equal(stored[0].id, `nudge:station:${seat}:2026-11-06T07`);
      assert.equal(stored[0].type, 'nudge');
      assert.equal(stored[0].kind, 'station');
      assert.equal(stored[0].reason, STATION_SENTENCE);
    }
  } finally {
    await stop(srv, data);
  }
});

test('a real test port stays quiet inside the half hour', async () => {
  const port = String(22000 + Math.floor(Math.random() * 20000));
  const { srv, data, raw } = spawnBoard({ PORT: port, STATION_NUDGE: '', STATION_NOW: OPEN });
  try {
    const port = await listenPort(srv);
    const seen = await (await fetch('http://127.0.0.1:' + port + '/inbox/forge?all=1', {
      headers: { Authorization: 'Bearer ' + raw.forge },
    })).json();
    assert.equal((seen.lines || []).filter((line) => line.kind === 'station').length, 0);
  } finally {
    await stop(srv, data);
  }
});

test('Railway posts on a real port inside the half hour', async () => {
  const port = String(22000 + Math.floor(Math.random() * 20000));
  const { srv, data, raw } = spawnBoard({
    PORT: port, STATION_NUDGE: '', STATION_NOW: OPEN, RAILWAY_ENVIRONMENT: 'production',
  });
  try {
    const port = await listenPort(srv);
    const seen = await (await fetch('http://127.0.0.1:' + port + '/inbox/forge?all=1', {
      headers: { Authorization: 'Bearer ' + raw.forge },
    })).json();
    const station = (seen.lines || []).filter((line) => line.kind === 'station');
    assert.equal(station.length, 1);
    assert.equal(station[0].id, 'nudge:station:forge:2026-11-06T07');
  } finally {
    await stop(srv, data);
  }
});

test('an owner clock names the zone, the window, and the seats', () => {
  const clock = parseOwnerClock('{"zone":"Asia/Tokyo","window":["09:00","17:30"],"seats":["herald","arch1"]}');
  assert.equal(clock.zone, 'Asia/Tokyo');
  assert.equal(stationHourKey('2026-10-26T09:00:00+09:00', clock), '2026-10-26T09');
  assert.equal(stationHourKey('2026-10-26T09:00:00+09:00'), null);
  assert.equal(stationHourKey('2026-10-26T17:31:00+09:00', clock), null);
  assert.deepEqual(stationSeats(IDS, clock), ['herald', 'arch1']);
  const due = stationDue('2026-10-26T09:00:00+09:00', '', IDS, clock);
  assert.deepEqual(due.lines.map((line) => line.seat), ['herald', 'arch1']);
  assert.equal(parseOwnerClock('{"zone":"Not/AZone","start":"09:00","end":"17:00","seats":["forge"]}'), null);
  assert.equal(keepStoredStartAfter('2026-01-01T00:00:00+00:00'), '2026-01-01T00:00:00+00:00');
  assert.match(chicagoStamp(Date.parse('2026-10-26T12:30:00Z')), /2026-10-26T07:30:00-05:00/);
});

test('a board boot on an owner clock posts only the named seat', async () => {
  const file = path.join(os.tmpdir(), 'owner-clock-' + crypto.randomBytes(4).toString('hex') + '.json');
  fs.writeFileSync(file, JSON.stringify({ zone: 'Asia/Tokyo', start: '09:00', end: '17:30', seats: ['blinky'] }));
  const { srv, data, raw } = spawnBoard({
    OWNER_CLOCK: file,
    STATION_NOW: '2026-11-06T09:00:00+09:00',
  });
  try {
    const port = await listenPort(srv);
    const blinky = await (await fetch('http://127.0.0.1:' + port + '/inbox/blinky?all=1', {
      headers: { Authorization: 'Bearer ' + raw.blinky },
    })).json();
    const station = (blinky.lines || []).filter((line) => line.kind === 'station');
    assert.equal(station.length, 1);
    assert.equal(station[0].id, 'nudge:station:blinky:2026-11-06T09');
    const forge = await (await fetch('http://127.0.0.1:' + port + '/inbox/forge?all=1', {
      headers: { Authorization: 'Bearer ' + raw.forge },
    })).json();
    assert.equal((forge.lines || []).filter((line) => line.kind === 'station').length, 0);
  } finally {
    await stop(srv, data);
    fs.rmSync(file, { force: true });
  }
});

test('a board boot before the half hour posts nothing', async () => {
  const { srv, data, raw } = spawnBoard({ STATION_NOW: '2026-11-06T07:29:00-06:00' });
  try {
    const port = await listenPort(srv);
    const seen = await (await fetch('http://127.0.0.1:' + port + '/inbox/forge?all=1', {
      headers: { Authorization: 'Bearer ' + raw.forge },
    })).json();
    const stored = (seen.lines || []).filter((line) => String(line.id || '').startsWith('nudge:station:'));
    assert.equal(stored.length, 0);
  } finally {
    await stop(srv, data);
  }
});
