// Coord and operator aliases follow the routing file (#423).
// seatIdOf, holdOwner, the card L1 fallback, and canonSeatToken use those seats.
// Equal-rank agent rows break ties by instant, including a Zulu stamp beside a Chicago offset.
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonSeatToken, configureWorkTrack, deriveTrack } from '../app/worktrack.mjs';
import { clockStamp } from '../app/chicago-stamp.mjs';
import { listenPort } from './free-port.mjs';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const LEAD_KEY = 'lead-example-key';
const OPS_KEY = 'ops-example-key';
const FORGE_KEY = 'forge-example-key';
const BLINKY_KEY = 'blinky-example-key';
const INGEST = 'example-ingest-secret-example-org-1';

describe('coord and operator routing', { concurrency: 1 }, () => {
  test('canonSeatToken keeps coord when configureWorkTrack is given the cos seat string', () => {
    configureWorkTrack({
      seatIds: ['lead', 'ops', 'critic'],
      alias: {
        coord: 'lead', coordinator: 'lead', cos: 'lead', triager: 'lead',
        operator: 'ops', tester: 'ops', qa: 'ops', lab: 'ops',
      },
    });
    assert.equal(canonSeatToken('coord'), 'lead');
    assert.equal(canonSeatToken('coordinator'), 'lead');
    assert.equal(canonSeatToken('cos'), 'lead');
    assert.equal(canonSeatToken('triager'), 'lead');
    assert.equal(canonSeatToken('operator'), 'ops');
    assert.equal(canonSeatToken('tester'), 'ops');
    assert.equal(canonSeatToken('qa'), 'ops');
    assert.equal(canonSeatToken('lab'), 'ops');
    configureWorkTrack({ seatIds: ['lead', 'ops'], alias: { coord: () => 'lead' } });
    assert.equal(canonSeatToken('coord'), '');
  });

  test('agentItems breaks an equal rank by instant when Zulu and offset strings disagree', () => {
    const fallZ = '2026-11-01T06:30:00.000Z';
    const fallWall = '2026-11-01T01:30:00.000-06:00';
    const cdtZ = '2026-07-15T16:00:00.000Z';
    const cdtWall = '2026-07-15T12:00:00.000-05:00';
    assert.ok(fallZ > fallWall);
    assert.ok(Date.parse(fallWall) > Date.parse(fallZ));
    assert.ok(cdtZ > cdtWall);
    assert.ok(Date.parse(cdtWall) > Date.parse(cdtZ));
    const track = deriveTrack({
      agents: [
        { agent: 'bc-fall0001', status: 'running', rank: 2, seat: 'forge', t_ct: fallWall, title: 'fall later' },
        { agent: 'bc-fall0001', status: 'running', rank: 2, seat: 'forge', t_ct: fallZ, title: 'fall earlier' },
        { agent: 'bc-cdt00001', status: 'running', rank: 2, seat: 'forge', t_ct: cdtZ, title: 'cdt earlier' },
        { agent: 'bc-cdt00001', status: 'running', rank: 2, seat: 'forge', t_ct: cdtWall, title: 'cdt later' },
        { agent: 'bc-rank0001', status: 'running', rank: 3, seat: 'forge', t_ct: '2026-01-01T00:00:00.000Z', title: 'higher rank' },
        { agent: 'bc-rank0001', status: 'running', rank: 1, seat: 'forge', t_ct: '2026-12-01T00:00:00.000Z', title: 'newer lower' },
      ],
    });
    const item = (id) => track.items.find((row) => row.agent === id);
    assert.equal(item('bc-fall0001').title, 'fall later');
    assert.equal(item('bc-fall0001').t_ct, fallWall);
    assert.equal(item('bc-cdt00001').title, 'cdt later');
    assert.equal(item('bc-cdt00001').t_ct, cdtWall);
    assert.equal(item('bc-rank0001').title, 'higher rank');
  });

  describe('non-default routing seats', () => {
    let child;
    let base;
    let data;
    let route;
    let logs = '';

    function auth(key) {
      return { headers: { Authorization: 'Bearer ' + key } };
    }

    before(async () => {
      data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-coord-route-'));
      route = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-coord-route-r-'));
      fs.writeFileSync(path.join(route, 'inbox-roles.json'), JSON.stringify({
        seats: { coord: { seat: 'lead' }, operator: { seat: 'ops' } },
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
          NUDGE_L1_S: '1',
          NUDGE_L2_S: '3600',
          NUDGE_L3_S: '3600',
          HELD_MAX_S: '1',
          LIVE_SEAT_IDS: 'lead,ops,critic,forge,blinky',
          SEAT_KEYS: JSON.stringify({
            lead: sha(LEAD_KEY), ops: sha(OPS_KEY), forge: sha(FORGE_KEY), blinky: sha(BLINKY_KEY),
          }),
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

    function card(number, over = {}) {
      const now = Date.now();
      return {
        key: 'example-org/app#' + number,
        kind: 'pr',
        repo: 'example-org/app',
        number,
        title: 'example ' + number,
        url: 'https://github.com/example-org/app/pull/' + number,
        owner: 'critic',
        stage: 'fix',
        state: 'live',
        packet: {},
        packet_ok: false,
        missing: [],
        beats: [{ t: now - 10000, what: 'pushed', url: '', id: 'b' + number }],
        last_beat_t: now - 10000,
        stall: true,
        ...over,
      };
    }

    test('seatIdOf routes operator aliases and a coord alias, and the fallbacks follow cosSeat', async () => {
      const pushed = await fetch(base + '/ingest', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'example',
          event_count: 0,
          generated_at: '2026-10-14T15:00:00-05:00',
          events: [],
          board: {
            updated_ct: '2026-10-14T15:00:00-05:00',
            cards: [
              card(41, { packet: { 'next owner': 'coord' } }),
              card(42, { packet: { 'next owner': 'operator' } }),
              card(43, { packet: { 'next owner': 'tester' } }),
              card(44, { packet: { 'next owner': 'qa' } }),
              card(45, { packet: { 'next owner': 'lab' } }),
              card(46, { packet: { 'next owner': 'coordinator' } }),
              card(47, { owner: 'not-a-seat', packet: {} }),
              card(48, { state: 'held', owner: 'not-a-seat', packet: {} }),
            ],
          },
        }),
      });
      assert.equal(pushed.status, 200, logs.slice(-400) + await pushed.clone().text());
      let body = [];
      for (let i = 0; i < 30; i++) {
        const res = await fetch(base + '/nudges', auth(OPS_KEY));
        assert.equal(res.status, 200, 'nudges ' + res.status);
        body = (await res.json()).nudges || [];
        if (body.some((n) => n.card === 'example-org/app#48' && n.kind === 'held')) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const l1 = (n) => body.find((row) => row.card === 'example-org/app#' + n && row.level === 1);
      assert.equal(l1(41).seat, 'lead');
      assert.equal(l1(41).via, 'next owner');
      for (const n of [42, 43, 44, 45]) {
        assert.equal(l1(n).seat, 'ops', 'card ' + n);
        assert.equal(l1(n).via, 'next owner');
        assert.notEqual(l1(n).seat, 'forge');
      }
      assert.equal(l1(46).seat, 'lead');
      assert.equal(l1(46).via, 'next owner');
      assert.equal(l1(47).seat, 'lead');
      assert.equal(l1(47).via, 'card owner');
      assert.notEqual(l1(47).seat, 'blinky');
      const held = body.find((row) => row.card === 'example-org/app#48' && row.kind === 'held');
      assert.ok(held, 'held nudge missing');
      assert.equal(held.seat, 'lead');
      assert.notEqual(held.seat, 'blinky');

      const line = (id, seat) => ({
        id, t_ct: new Date(Date.now() - 60 * 1000).toISOString(), seat, type: 'note', repo: 'example-org/app', number: 3,
        title: 'example alias', url: 'https://github.com/example-org/app/pull/3', reason: 'example alias',
      });
      const posted = await fetch(base + '/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Live-Ingest': INGEST },
        body: JSON.stringify({ lines: [line('ex-route-coord', 'coord'), line('ex-route-operator', 'operator')] }),
      });
      assert.equal(posted.status, 200, await posted.clone().text());
      const ids = async (key, seat) => {
        const res = await fetch(base + '/inbox/' + seat + '?all=1', auth(key));
        assert.equal(res.status, 200, seat);
        return ((await res.json()).lines || []).map((row) => row.id);
      };
      assert.ok((await ids(LEAD_KEY, 'lead')).includes('ex-route-coord'));
      assert.equal((await ids(BLINKY_KEY, 'blinky')).includes('ex-route-coord'), false);
      assert.ok((await ids(OPS_KEY, 'ops')).includes('ex-route-operator'));
      assert.equal((await ids(FORGE_KEY, 'forge')).includes('ex-route-operator'), false);
    });

    test('canonSeatToken(coord) on the server is the routed cos seat, not blinky', async () => {
      const post = (key, seat) => fetch(base + '/activity', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ t_ct: new Date().toISOString(), kind: 'turn', action: 'start', seat }),
      });
      assert.equal((await post(LEAD_KEY, 'coord')).status, 202);
      assert.equal((await post(BLINKY_KEY, 'coord')).status, 403);
      assert.equal((await post(LEAD_KEY, 'coordinator')).status, 202);
      assert.equal((await post(OPS_KEY, 'operator')).status, 202);
      assert.equal((await post(FORGE_KEY, 'operator')).status, 403);
      assert.equal((await post(OPS_KEY, 'tester')).status, 202);
      assert.equal((await post(OPS_KEY, 'qa')).status, 202);
      assert.equal((await post(OPS_KEY, 'lab')).status, 202);
      assert.equal((await post(FORGE_KEY, 'lab')).status, 403);
    });

    test('served ctStamp matches clockStamp across Chicago offsets and invalid input', async () => {
      const samples = {
        cdt: '2026-07-15T16:00:00.123Z',
        cst: '2026-12-15T18:00:00.004Z',
        first: '2026-11-01T06:30:00.000Z',
        second: '2026-11-01T07:30:00.000Z',
        gapbefore: '2026-03-08T07:30:00.000Z',
        gapafter: '2026-03-08T08:30:00.000Z',
        midnight: '2026-01-15T06:00:00.000Z',
        bad: 'not-a-time',
      };
      const seats = {};
      for (const [name, last_ct] of Object.entries(samples)) seats[name] = { active: false, last_ct, via: 'box' };
      const pushed = await fetch(base + '/ingest', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'example',
          event_count: 0,
          generated_at: '2026-10-14T15:00:00-05:00',
          events: [],
          fleet: { window_min: 15, total: 8, active: 0, seats },
        }),
      });
      assert.equal(pushed.status, 200, await pushed.clone().text());
      const live = await (await fetch(base + '/live-events.json')).json();
      const got = live.fleet && live.fleet.seats;
      assert.ok(got, 'fleet missing');
      for (const name of ['cdt', 'cst', 'first', 'second', 'gapbefore', 'gapafter', 'midnight']) {
        assert.equal(got[name].last_ct, clockStamp(samples[name]), name);
      }
      assert.notEqual(got.first.last_ct, got.second.last_ct);
      assert.match(got.gapbefore.last_ct, /-06:00$/);
      assert.match(got.gapafter.last_ct, /-05:00$/);
      assert.match(got.midnight.last_ct, /T00:/);
      assert.equal(clockStamp('not-a-time'), null);
      assert.equal(got.bad.last_ct, null);
    });
  });
});
