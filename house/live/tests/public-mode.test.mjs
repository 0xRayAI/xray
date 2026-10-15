// Site mode: gated (default: password + masking) vs public (no password, real repo names on page, feed and logs).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http'; import crypto from 'node:crypto'; import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
const APP = process.env.MESH_APP_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const LIVE = path.join(APP, '..');
const gh = http.createServer((q, s) => {
  if (q.url === '/repos/acme/forbidden') { s.writeHead(403); return s.end('{}'); }
  if (q.url.startsWith('/repos/')) { s.writeHead(200); return s.end(JSON.stringify({ private: q.url === '/repos/acme/secret' })); }
  s.writeHead(200, { 'Content-Type': 'application/json' });
  s.end(JSON.stringify([{ full_name: 'acme/one' }, { full_name: 'acme/secret' }, { full_name: 'acme/forbidden' }]));
});
await new Promise(r => gh.listen(0, '127.0.0.1', r));
const kids = [], dirs = [];
after(async () => {
  await Promise.all(kids.map(k => new Promise(resolve => {
    if (k.exitCode != null || k.signalCode != null) return resolve();
    k.once('exit', () => resolve());
    try { process.kill(-k.pid, 'SIGTERM'); }
    catch { k.kill('SIGTERM'); }
  })));
  await new Promise(r => gh.close(r));
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
});
function boot(extra) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-pub-')); dirs.push(data);
  const env = { PORT: '0', PATH: process.env.PATH, SESSION_SECRET: crypto.randomBytes(32).toString('hex'), INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
    MESH_DATA_DIR: data, GITHUB_API_URL: `http://127.0.0.1:${gh.address().port}`, GITHUB_READ_TOKEN: 'read-tok-test', COLLECTOR_ORG: 'acme', ...extra };
  const p = spawn(process.execPath, [path.join(APP, 'server.mjs')], { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }); kids.push(p);
  const s = { data, logs: '', get base() { const m = /listening on :(\d+)/.exec(this.logs); return `http://127.0.0.1:${m ? m[1] : 1}`; } };
  p.stdout.on('data', d => s.logs += d); p.stderr.on('data', d => s.logs += d);
  s.until = async re => { for (let i = 0; i < 80 && !re.test(s.logs); i++) await new Promise(r => setTimeout(r, 100)); return re.test(s.logs); };
  return s;
}
const FEED = { title: 'Example live mesh', generated_at: '2026-10-13T10:30:00-05:00', events: [
  { id: 's1', repo: 'acme/secret', number: 7, kind: 'pr_open', t_ct: '2026-10-13T10:21:00-05:00', label: 'secret #7 opened · Top plan', title: 'Top plan', url: 'https://github.com/acme/secret/pull/7' }] };
async function feedOf(s, headers = {}) {
  fs.mkdirSync(path.join(s.data, 'feed'), { recursive: true });
  fs.writeFileSync(path.join(s.data, 'feed', 'github-events.json'), JSON.stringify(FEED));
  let f; for (let i = 0; i < 60; i++) { const r = await fetch(s.base + '/live-events.json', { headers }); f = { status: r.status, j: await r.json() }; if (f.j.events?.some(e => e.id === 's1')) break; await new Promise(r => setTimeout(r, 100)); }
  return f;
}

test('public mode (LIVE_PUBLIC=1): no password needed, page + feed open, real repo names in feed and logs', async () => {
  const s = boot({ LIVE_PUBLIC: '1' });   // no MESH_PASSWORD at all
  assert.ok(await s.until(/listening on :\d+/), s.logs);   // #304: port 0, read the real port
  assert.ok(await s.until(/listening on :\d+ \(public: no password, no masking\)/), s.logs);
  assert.ok(await s.until(/collector: repos acme\/one acme\/secret /), s.logs);
  assert.ok(await s.until(/collector: skip acme\/forbidden \(403\)/), s.logs);
  assert.ok(!/private repo/.test(s.logs), s.logs);
  const page = await fetch(s.base + '/'); assert.equal(page.status, 200); assert.ok(!(await page.text()).includes('type="password"'));
  const lr = await fetch(s.base + '/login', { method: 'POST', body: 'password=x', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.deepEqual([lr.status, lr.headers.get('location')], [303, '/']);
  const f = await feedOf(s);
  assert.equal(f.status, 200);
  const e = f.j.events.find(x => x.id === 's1');
  assert.deepEqual([e.repo, e.title, e.url], ['acme/secret', 'Top plan', 'https://github.com/acme/secret/pull/7']);
  assert.equal((await (await fetch(s.base + '/healthz')).json()).mode, 'public');
  assert.equal(f.j.title, 'Bifrost live mesh');
  assert.ok(f.j.events.every(x => typeof x.credit === 'string' && x.credit), 'no blank credits');   // server fills any source's gaps   // a collector header saying Example never reaches the feed
  assert.ok([200, 204].includes((await fetch(s.base + '/favicon.ico')).status));   // public: no 401
  const c = await fetch(s.base + '/cards'); assert.equal(c.status, 200);
  assert.deepEqual([(await c.json()).seat], ['all']);
  const cm = await fetch(s.base + '/cards?seat=mill'); assert.equal(cm.status, 200); assert.equal((await cm.json()).seat, 'mill');
});

test('gated mode (default): missing MESH_PASSWORD refuses to start; with it, login page titled Bifrost and private repos masked', async () => {
  const r = spawnSync(process.execPath, [path.join(APP, 'server.mjs')], { env: { PATH: process.env.PATH, SESSION_SECRET: 'x'.repeat(32), INGEST_SECRET: 'y'.repeat(32), COLLECTOR: 'off' }, timeout: 5000, encoding: 'utf8' });
  assert.equal(r.status, 1); assert.match(r.stderr, /MESH_PASSWORD/);
  const pw = 'x' + crypto.randomBytes(4).toString('hex');
  const s = boot({ MESH_PASSWORD: pw, LIVE_PUBLIC: '0' });
  assert.ok(await s.until(/listening on :\d+/), s.logs);   // #304: port 0, read the real port
  assert.ok(await s.until(/collector: repos acme\/one private repo #\d+ /), s.logs);
  assert.ok(await s.until(/collector: skip private repo #\d+ \(403\)/), s.logs);
  const page = await fetch(s.base + '/'); assert.equal(page.status, 401);
  const html = await page.text(); assert.match(html, /<title>Bifrost · live mesh<\/title>/); assert.ok(!html.includes('Example'));
  assert.equal((await fetch(s.base + '/live-events.json')).status, 401);
  const lr = await fetch(s.base + '/login', { method: 'POST', body: 'password=' + pw, redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const f = await feedOf(s, { Cookie: String(lr.headers.get('set-cookie')).split(';')[0] });
  assert.ok(!/secret|Top plan/.test(JSON.stringify(f.j)));
  assert.equal((await (await fetch(s.base + '/healthz')).json()).mode, 'gated');
  assert.equal((await fetch(s.base + '/cards')).status, 401);
  assert.equal((await fetch(s.base + '/favicon.ico')).status, 401);   // gated stays gated
  assert.equal((await fetch(s.base + '/cards?seat=coord')).status, 401);
});

test('our deploy: committed feed/site.json is public + Bifrost, and deploy.sh ships it beside the collector', async () => {
  const site = JSON.parse(fs.readFileSync(path.join(LIVE, 'feed', 'site.json'), 'utf8'));
  assert.equal(site.title, 'Bifrost live fleet');
  const s = boot({ LIVE_PUBLIC: '1', LIVE_SITE_TITLE: site.title });   // same value the deployed collector/site.json gives
  assert.ok(await s.until(/listening on :\d+/), s.logs);   // #304: port 0, read the real port
  assert.ok(await s.until(/listening on/), s.logs);
  const f = await feedOf(s); assert.equal(f.j.title, 'Bifrost live fleet');
  assert.deepEqual([site.public, site.name], [true, 'Bifrost']);
  assert.match(fs.readFileSync(path.join(APP, 'assemble-collector.sh'), 'utf8'), /site\.json "\$C\/"/);   // deploy.sh -> assemble-collector.sh (#292)
});
