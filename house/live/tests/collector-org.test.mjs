// D18: COLLECTOR_ORG lists the org's repos (unioned with COLLECTOR_REPOS) at start and on each refresh; a new repo gets collected.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
const APP = process.env.MESH_APP_DIR;
let repos = ['acme/one'], auth = '';
const MPW = 'x' + crypto.randomBytes(4).toString('hex'), ING = crypto.randomBytes(32).toString('hex');
const gh = http.createServer((q, s) => {
  auth = q.headers.authorization || '';
  const deny = { '/repos/acme/forbidden': 403, '/repos/acme/gone': 404 }[q.url];
  if (deny) { s.writeHead(deny); return s.end('{}'); }
  if (q.url.startsWith('/repos/')) { s.writeHead(200); return s.end(JSON.stringify({ private: q.url === '/repos/acme/secret' })); }
  if (!q.url.startsWith('/orgs/acme/repos')) { s.writeHead(404); return s.end('[]'); }
  s.writeHead(200, { 'Content-Type': 'application/json' });
  s.end(JSON.stringify([...repos.map(full_name => ({ full_name })), { full_name: 'acme/old', archived: true }, { full_name: 'acme/secret', private: true }, { full_name: 'acme/forbidden' }, { full_name: 'acme/gone' }]));
});
await new Promise(r => gh.listen(0, '127.0.0.1', r));
const PORT = 23000 + Math.floor(Math.random() * 1000), BASE = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-org-')); let logs = '';
const srv = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env: { PORT: String(PORT), PATH: process.env.PATH,
  MESH_PASSWORD: MPW, SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: ING,
  MESH_DATA_DIR: DATA, GITHUB_API_URL: `http://127.0.0.1:${gh.address().port}`, GITHUB_READ_TOKEN: 'read-tok-test', COLLECTOR_ORG: 'acme',
  COLLECTOR_REPOS: 'other/pinned', COLLECTOR_ORG_REFRESH_S: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => logs += d); srv.stderr.on('data', d => logs += d);
after(() => { srv.kill(); gh.close(); fs.rmSync(DATA, { recursive: true, force: true }); });
const until = async re => { for (let i = 0; i < 80 && !re.test(logs); i++) await new Promise(r => setTimeout(r, 100)); return re.test(logs); };
test('org repos unioned with COLLECTOR_REPOS at start; a repo new to the org is picked up on refresh', async () => {
  assert.ok(await until(/collector: repos acme\/one private repo #\d+ other\/pinned\n/), logs);
  assert.equal(auth, 'Bearer read-tok-test');
  repos = ['acme/one', 'acme/new'];
  assert.ok(await until(/collector: repos acme\/new acme\/one private repo #\d+ other\/pinned\n/), logs);
  assert.ok(!logs.includes('read-tok-test'), 'token logged');
});
test('archived, 403 and 404 org repos are skipped; the server keeps serving', async () => {
  assert.ok(await until(/collector: skip private repo #\d+ \(403\)/) && await until(/collector: skip private repo #\d+ \(404\)/), logs);
  assert.ok(!/collector: repos .*acme\/(old|forbidden|gone)/.test(logs), logs);
  const h = await fetch(BASE + '/healthz'); assert.equal(h.status, 200);
  const j = await h.json(); assert.equal(j.repos_unreadable, 2, JSON.stringify(j));
  assert.ok(!JSON.stringify(j).includes('forbidden'));
});
test('/healthz (no auth): repo count + oldest/newest collected time, no repo names', async () => {
  const recent = new Date(Date.now() - 60 * 1000).toISOString();
  const feed = { generated_at: '2026-10-13T07:00:00-05:00', events: [
    { id: 'a', repo: 'acme/one', t_ct: recent, label: 'secret-ish label' },
    { id: 'b', repo: 'acme/one', t_ct: recent, label: 'x' }] };
  fs.mkdirSync(path.join(DATA, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify(feed));
  let h;
  for (let i = 0; i < 60; i++) { h = await (await fetch(BASE + '/healthz')).json(); if (h.newest_collected) break; await new Promise(r => setTimeout(r, 100)); }
  assert.equal(h.ok, true);
  assert.deepEqual([h.repos, h.oldest_collected, h.newest_collected], [4, '2026-10-13T07:00:00-05:00', '2026-10-13T07:00:00-05:00']);
  const raw = JSON.stringify(h); assert.ok(!raw.includes('acme') && !raw.includes('label') && !raw.includes('read-tok-test'));
});
test('private repo: masked on the login-page feed (no name, no title), real for inbox routing', async () => {
  const feed = { generated_at: '2026-10-13T07:05:00-05:00', events: [
    { id: 's1', repo: 'acme/secret', number: 7, kind: 'pr_open', t_ct: '2026-10-13T07:01:00-05:00', label: 'secret #7 opened · Top plan', title: 'Top plan', url: 'https://github.com/acme/secret/pull/7' },
    { id: 'p1', repo: 'acme/one', number: 8, kind: 'pr_open', t_ct: '2026-10-13T07:02:00-05:00', label: 'one #8 opened · Fine', title: 'Fine' }] };
  fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify(feed));
  const lr = await fetch(BASE + '/login', { method: 'POST', body: 'password=' + MPW, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const ck = String(lr.headers.get('set-cookie')).split(';')[0];
  let f;
  for (let i = 0; i < 60; i++) { f = await (await fetch(BASE + '/live-events.json', { headers: { Cookie: ck } })).json(); if (f.events?.some(e => e.id === 's1')) break; await new Promise(r => setTimeout(r, 100)); }
  const raw = JSON.stringify(f);
  assert.ok(!/secret|Top plan/.test(raw), raw);
  assert.equal(f.events.find(e => e.id === 's1').repo, 'private repo');
  assert.equal(f.events.find(e => e.id === 'p1').title, 'Fine');
  const ie = await (await fetch(BASE + '/ingest/events', { headers: { Authorization: 'Bearer ' + ING } })).json();
  assert.equal(ie.events.find(e => e.id === 's1').repo, 'acme/secret');
});
test('private repo: header.fleet / header.board and seats active survive masking; masked events keep number and sha', async () => {
  const now = new Date().toISOString();
  const feed = { generated_at: now, events: [{ id: 's2', repo: 'acme/secret', number: 9, sha: 'abc1234', kind: 'pr_open', t_ct: now, title: 'Hidden', url: 'https://github.com/acme/secret/pull/9' }],
    fleet: { window_min: 15, seats: { forge: { last_ct: now, via: 'github' } }, working: { forge: { via: 'github', repo: 'acme/secret', number: 9, url: 'https://github.com/Acme/Secret/pull/9' } } },
    board: { waves: [{ repo: 'acme/secret', number: 9, title: 'Wave', note: 'see acme/secret#9' }] } };
  fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify(feed));
  const lr = await fetch(BASE + '/login', { method: 'POST', body: 'password=' + MPW, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const ck = String(lr.headers.get('set-cookie')).split(';')[0];
  let f;
  for (let i = 0; i < 60; i++) { f = await (await fetch(BASE + '/live-events.json', { headers: { Cookie: ck } })).json(); if (f.events?.some(e => e.id === 's2')) break; await new Promise(r => setTimeout(r, 100)); }
  const e = f.events.find(x => x.id === 's2');
  assert.deepEqual([e.repo, e.number, e.sha, e.title, e.url], ['private repo', 9, 'abc1234', undefined, undefined]);
  assert.equal(f.fleet.seats.forge.active, true, JSON.stringify(f.fleet));
  // revert check: masking the header again turns these into 'private repo' and drops number / active
  assert.deepEqual([f.fleet.working.forge.via, f.fleet.working.forge.number, f.fleet.working.forge.repo], ['github', 9, 'private repo']);
  assert.equal(f.board?.waves?.[0]?.title, 'Wave', JSON.stringify(f.board));
  assert.equal(f.board.waves[0].number, 9);
  // a private repo's full name never appears anywhere in the signed-in JSON (repo fields, URLs, free text)
  assert.ok(!/acme\/secret/i.test(JSON.stringify(f)), JSON.stringify(f));
  // delta keeps the header too
  const d = await (await fetch(BASE + '/live-events.json?since=' + encodeURIComponent(f.cursor.replace(/\d+$/, n => String(Math.max(0, n - 1)))), { headers: { Cookie: ck } })).json();
  assert.ok(!/acme\/secret/i.test(JSON.stringify(d)), JSON.stringify(d));
  if (d.delta) assert.equal(d.fleet.working.forge.via, 'github');
});
for (const order of [['acme/one', 'acme/secret'], ['acme/secret', 'acme/one']]) {
  test(`header with repos [${order[0] === 'acme/one' ? 'public' : 'private'} first]: never collapsed, private names become 'private repo'`, async () => {
    const now = new Date().toISOString(), id = 'h' + order[0].length + order[0][5];
    const feed = { generated_at: now, kinds: ['pr_open'], sources: ['github'], notes: ['watching acme/secret'], repo: order[0], repos: [...order, 'other/unconfirmed'],
      events: [{ id, repo: 'acme/one', kind: 'pr_open', t_ct: now, title: 'Open' }], fleet: { window_min: 15, seats: {} }, board: { waves: [] } };
    fs.mkdirSync(path.join(DATA, 'feed'), { recursive: true });
    fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify(feed));
    const lr = await fetch(BASE + '/login', { method: 'POST', body: 'password=' + MPW, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const ck = String(lr.headers.get('set-cookie')).split(';')[0];
    let f;
    for (let i = 0; i < 60; i++) { f = await (await fetch(BASE + '/live-events.json', { headers: { Cookie: ck } })).json(); if (f.generated_at === now && f.events?.some(e => e.id === id)) break; await new Promise(r => setTimeout(r, 100)); }
    assert.equal(f.generated_at, now, JSON.stringify(f));
    assert.equal(typeof f.event_count, 'number');
    assert.ok(f.kinds.includes('pr_open')); assert.ok(f.sources?.github, JSON.stringify(f.sources)); assert.deepEqual(f.notes, ['watching private repo']);
    assert.ok(f.fleet && f.board, JSON.stringify(f));
    assert.equal(f.repo, order[0] === 'acme/one' ? 'acme/one' : 'private repo');
    assert.deepEqual(f.repos, order.map(r => r === 'acme/one' ? r : 'private repo').concat('private repo'));
    assert.ok(!/acme\/secret|other\/unconfirmed/i.test(JSON.stringify(f)), JSON.stringify(f));
  });
}
test('N1: an event whose repo is the bare short name of a private repo is masked too', async () => {
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(DATA, 'feed', 'github-events.json'), JSON.stringify({ generated_at: now,
    events: [{ id: 'sh1', repo: 'secret', number: 3, kind: 'pr_open', t_ct: now, title: 'Bare hidden' }] }));
  const lr = await fetch(BASE + '/login', { method: 'POST', body: 'password=' + MPW, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const ck = String(lr.headers.get('set-cookie')).split(';')[0];
  let f;
  for (let i = 0; i < 60; i++) { f = await (await fetch(BASE + '/live-events.json', { headers: { Cookie: ck } })).json(); if (f.events?.some(e => e.id === 'sh1')) break; await new Promise(r => setTimeout(r, 100)); }
  const e = f.events.find(x => x.id === 'sh1');
  assert.deepEqual([e.repo, e.number, e.title], ['private repo', 3, undefined]);
});
test('logs never name a private or unreadable repo (repos / skip lines); public names stay', async () => {
  assert.ok(await until(/collector: repos .*\n/) && await until(/collector: skip .*\(404\)/), logs);
  for (const name of ['acme/secret', 'acme/forbidden', 'acme/gone']) assert.ok(!logs.toLowerCase().includes(name), name + ' in logs:\n' + logs);
  assert.ok(!/\b(secret|forbidden|gone)\b/i.test(logs.split('\n').filter(l => l.startsWith('collector:')).join('\n')), logs);
  assert.match(logs, /collector: repos [^\n]*acme\/one/);
  const tags = [...logs.matchAll(/private repo #(\d+)/g)].map(m => m[1]);
  assert.ok(new Set(tags).size >= 3, tags.join(','));   // one stable number per hidden repo
});
