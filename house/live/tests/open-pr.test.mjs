import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = fileURLToPath(new URL('../tools/open-pr', import.meta.url));
const TOKEN = 'ghs_mockedInstallationToken0001';
const LIVE_KEY = 'live-key-sentinel-9f3c7a';
const OWNER_TOKEN = 'ghs_ownerfallbackshouldnotuse000';
const BODY = 'Fix the gate.\n';

function pem() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return privateKey.export({ type: 'pkcs1', format: 'pem' });
}

function baseEnv(extra = {}) {
  return { PATH: process.env.PATH || '', HOME: os.tmpdir(), ...extra };
}

function run(args, env) {
  return spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env, timeout: 20000 });
}

function runLive(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TOOL, ...args], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 10000);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

const ARGS = ['--repo', 'org/app', '--head', 'cursor/topic', '--base', 'main', '--title', 'Owner-free', '--body', BODY];

function listen() {
  const hits = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      hits.push({
        url: req.url || '',
        method: req.method || '',
        auth: req.headers.authorization || '',
        body: Buffer.concat(chunks).toString('utf8'),
      });
      if ((req.url || '').includes('/access_tokens')) {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: TOKEN }));
        return;
      }
      if (req.method === 'POST' && req.url === '/repos/org/app/pulls') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ html_url: 'https://github.com/org/app/pull/12', number: 12 }));
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, hits, port: server.address().port }));
  });
}

function assertHidden(proc, secrets) {
  const text = `${proc.stdout}\n${proc.stderr}`;
  for (const secret of secrets) {
    assert.equal(text.includes(secret), false, 'secret leaked');
  }
  assert.equal(text.includes('BEGIN '), false);
}

test('refuses when only a live key is set', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-pr-key-'));
  try {
    fs.writeFileSync(path.join(dir, 'forge.key'), `${LIVE_KEY}\n`);
    const proc = run(ARGS, baseEnv({ SEAT_KEYS_DIR: dir, LIVE_KEY }));
    assert.notEqual(proc.status, 0);
    assert.match(proc.stdout, /handoff for forge/);
    assert.match(proc.stdout, /branch: cursor\/topic/);
    assert.match(proc.stdout, /Fix the gate\./);
    assertHidden(proc, [LIVE_KEY]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('refuses when no App token is set and ignores GITHUB_TOKEN', async () => {
  const { server, hits, port } = await listen();
  try {
    const proc = run(ARGS, baseEnv({
      GITHUB_TOKEN: OWNER_TOKEN,
      GITHUB_API_URL: `http://127.0.0.1:${port}`,
    }));
    assert.equal(proc.status, 1, proc.stderr);
    assert.match(proc.stdout, /handoff for forge/);
    assert.match(proc.stdout, /branch: cursor\/topic/);
    assert.match(proc.stdout, /body:\nFix the gate\./);
    assert.equal(hits.length, 0);
    assertHidden(proc, [OWNER_TOKEN]);
  } finally {
    server.close();
  }
});

test('opens a pull request with a minted App token', async () => {
  const { server, hits, port } = await listen();
  const key = pem();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-pr-app-'));
  try {
    fs.writeFileSync(path.join(dir, 'forge.key'), `${LIVE_KEY}\n`);
    const proc = await runLive(ARGS, baseEnv({
      GITHUB_API_URL: `http://127.0.0.1:${port}`,
      GITHUB_APP_ID: '12345',
      GITHUB_APP_INSTALLATION_ID: '678',
      GITHUB_APP_PRIVATE_KEY: key,
      GITHUB_TOKEN: OWNER_TOKEN,
      SEAT_KEYS_DIR: dir,
      LIVE_KEY,
    }));
    assert.equal(proc.status, 0, proc.stderr);
    assert.equal(proc.stdout, 'https://github.com/org/app/pull/12\n');
    assert.equal(hits.length, 2);
    assert.match(hits[0].url, /\/app\/installations\/678\/access_tokens$/);
    assert.match(hits[0].auth, /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.equal(hits[0].auth.includes(TOKEN), false);
    assert.equal(hits[0].auth.includes(OWNER_TOKEN), false);
    assert.equal(hits[0].auth.includes(LIVE_KEY), false);
    assert.equal(hits[1].url, '/repos/org/app/pulls');
    assert.equal(hits[1].auth, `Bearer ${TOKEN}`);
    const posted = JSON.parse(hits[1].body);
    assert.equal(posted.head, 'cursor/topic');
    assert.equal(posted.base, 'main');
    assert.equal(posted.title, 'Owner-free');
    assert.equal(posted.body, BODY);
    assertHidden(proc, [TOKEN, OWNER_TOKEN, LIVE_KEY, key]);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
