// Pinned origin: production and bad values exit; /healthz returns the pin, not Host.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const src = fs.readFileSync(path.join(APP, 'server.mjs'), 'utf8');

function spawnServer(extra) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-origin-'));
  const child = spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0',   // #304: the OS picks the port; read it from the listening line
      MESH_PASSWORD: 'pw-' + crypto.randomBytes(4).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: crypto.randomBytes(32).toString('hex'),
      PATH: process.env.PATH,
      MESH_DATA_DIR: data,
      COLLECTOR: 'off',
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', d => { logs += d; });
  child.stderr.on('data', d => { logs += d; });
  return { child, get port() { const m = /listening on :(\d+)/.exec(logs); return m ? Number(m[1]) : 0; }, data, logs: () => logs };
}

// wide timeout: a loaded box (#304 parallel runs) is slow to start node
function exited(child, ms = 20000) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve('timeout'), ms);
    child.once('exit', code => { clearTimeout(t); resolve(code); });
  });
}

async function stop(child) {
  if (!child || child.exitCode != null) return;
  const done = new Promise(r => child.once('exit', r));
  child.kill();
  await done;
}

test('login redirects stay relative and there is no absoluteUrl helper', () => {
  assert.match(src, /Location: '\/'/);
  assert.doesNotMatch(src, /absoluteUrl/);
  assert.doesNotMatch(src, /x-forwarded-host/i);
});

test('production without an origin exits 1', async () => {
  const srv = spawnServer({ NODE_ENV: 'production' });
  try {
    assert.equal(await exited(srv.child), 1, srv.logs());
  } finally {
    await stop(srv.child);
    fs.rmSync(srv.data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});

test('http://evil.com and a credentialed https origin exit 1', async () => {
  for (const origin of ['http://evil.com', 'https://user:pass@board.example']) {
    const srv = spawnServer({ APP_PUBLIC_ORIGIN: origin });
    try {
      assert.equal(await exited(srv.child), 1, origin + '\n' + srv.logs());
    } finally {
      await stop(srv.child);
      fs.rmSync(srv.data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    }
  }
});

function getHealth(port, headers, setHost = true) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/healthz', headers, setHost }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('healthz returns the pinned origin and ignores Host and X-Forwarded-Host', async () => {
  const srv = spawnServer({ APP_PUBLIC_ORIGIN: 'https://board.example' });
  try {
    for (let i = 0; i < 300; i++) {
      try { if (srv.port && (await fetch(`http://127.0.0.1:${srv.port}/healthz`)).ok) break; } catch { /* not up */ }
      await new Promise(r => setTimeout(r, 100));
      if (i === 299) throw new Error(srv.logs());
    }
    const hostile = await getHealth(srv.port, { Host: 'evil.com', 'X-Forwarded-Host': 'evil.com' });
    assert.equal(hostile.status, 200);
    const body = JSON.parse(hostile.body);
    assert.equal(body.origin, 'https://board.example');
    assert.ok(!hostile.body.includes('evil.com'));
    const bare = await getHealth(srv.port, {}, false);
    assert.equal(bare.status, 200);
    assert.equal(JSON.parse(bare.body).origin, 'https://board.example');
    assert.ok(!bare.body.includes('evil.com'));
  } finally {
    await stop(srv.child);
    fs.rmSync(srv.data, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
});
