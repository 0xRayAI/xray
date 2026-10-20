import { spawn, spawnSync } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../.cursor/hooks/cloud-activity.sh');
const AGENT = 'bc-531f2033-90e0-595f-87de-8dfe576ec69c';
const KEY = 'planted-activity-key-9f3a';

interface Hit {
  body: string;
  auth: string;
  url: string;
}

function run(stdin: Record<string, unknown>, env: NodeJS.ProcessEnv) {
  const started = Date.now();
  return new Promise<{ status: number | null; stdout: string; stderr: string; elapsed: number }>((resolve, reject) => {
    const child = spawn('/bin/sh', [script], { env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('hook exceeded 4s'));
    }, 4000);
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr, elapsed: Date.now() - started });
    });
    child.stdin.end(JSON.stringify(stdin));
  });
}

function envOf(root: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH || '/usr/bin:/bin',
    CURSOR_PROJECT_DIR: root,
    CURSOR_AGENT: '1',
    CURSOR_CONVERSATION_ID: AGENT,
    ...extra,
  };
}

function assertQuiet(stdout: string, stderr: string) {
  const out = stdout + stderr;
  expect(out).not.toContain(KEY);
  expect(out).not.toContain('Authorization');
  expect(out).not.toContain('Bearer');
  expect(stdout.trim()).toBe('{}');
  expect(stdout).not.toContain('followup_message');
}

function listen(status: number, hang = false): Promise<{ url: string; hits: Hit[]; close: () => Promise<void> }> {
  const hits: Hit[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      hits.push({
        body: Buffer.concat(chunks).toString('utf8'),
        auth: String(req.headers.authorization || ''),
        url: req.url || '',
      });
      if (hang) return;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end('{"ok":false}');
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('no port'));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        hits,
        close: () => new Promise((done) => {
          server.closeAllConnections();
          server.close(() => done());
        }),
      });
    });
  });
}

describe('cloud activity hook', () => {
  it('posts launch once per session and finished for every stop status', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloud-activity-'));
    const board = await listen(202);
    try {
      const env = envOf(root, { LIVE_URL: board.url, LIVE_ACTIVITY_KEY: KEY });
      const first = await run({ hook_event_name: 'postToolUse', tool_input: { command: KEY } }, env);
      expect(first.status).toBe(0);
      assertQuiet(first.stdout, first.stderr);
      const second = await run({ hook_event_name: 'postToolUse' }, env);
      expect(second.status).toBe(0);
      assertQuiet(second.stdout, second.stderr);
      expect(board.hits).toHaveLength(1);
      const launch = JSON.parse(board.hits[0]?.body || '{}') as Record<string, string>;
      expect(launch).toMatchObject({ kind: 'cloud_agent', action: 'launch', agent: AGENT });
      expect(launch.seat).toBeUndefined();
      expect(launch.t_ct).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      expect(board.hits[0]?.auth).toBe('Bearer ' + KEY);
      for (const status of ['completed', 'aborted', 'error']) {
        const stopped = await run({ hook_event_name: 'stop', status }, env);
        expect(stopped.status).toBe(0);
        assertQuiet(stopped.stdout, stopped.stderr);
        const again = await run({ hook_event_name: 'sessionStart' }, env);
        expect(again.status).toBe(0);
        assertQuiet(again.stdout, again.stderr);
      }
      const actions = board.hits.map((hit) => (JSON.parse(hit.body) as { action: string }).action);
      expect(actions).toEqual(['launch', 'finished', 'launch', 'finished', 'launch', 'finished', 'launch']);
      for (const hit of board.hits) expect(hit.body).not.toContain(KEY);
    } finally {
      await board.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails open on 401, timeout, a refused port, and missing env without printing the key', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloud-activity-fail-'));
    const denied = await listen(401);
    const hung = await listen(200, true);
    try {
      const deniedRun = await run({ hook_event_name: 'sessionStart' }, envOf(root, { LIVE_URL: denied.url, LIVE_ACTIVITY_KEY: KEY }));
      expect(deniedRun.status).toBe(0);
      expect(deniedRun.status).not.toBe(2);
      assertQuiet(deniedRun.stdout, deniedRun.stderr);
      expect(denied.hits).toHaveLength(1);
      const deniedAgain = await run({ hook_event_name: 'postToolUse' }, envOf(root, { LIVE_URL: denied.url, LIVE_ACTIVITY_KEY: KEY }));
      expect(deniedAgain.status).toBe(0);
      assertQuiet(deniedAgain.stdout, deniedAgain.stderr);
      expect(denied.hits).toHaveLength(2);

      const slowRoot = mkdtempSync(path.join(tmpdir(), 'cloud-activity-slow-'));
      const started = Date.now();
      const timed = await run({ hook_event_name: 'postToolUse' }, envOf(slowRoot, { LIVE_URL: hung.url, LIVE_ACTIVITY_KEY: KEY }));
      expect(timed.status).toBe(0);
      expect(Date.now() - started).toBeLessThan(2000);
      assertQuiet(timed.stdout, timed.stderr);
      const timedAgain = await run({ hook_event_name: 'postToolUse' }, envOf(slowRoot, { LIVE_URL: hung.url, LIVE_ACTIVITY_KEY: KEY }));
      expect(timedAgain.status).toBe(0);
      expect(hung.hits).toHaveLength(2);
      rmSync(slowRoot, { recursive: true, force: true });

      const refusedRoot = mkdtempSync(path.join(tmpdir(), 'cloud-activity-refused-'));
      const refused = await run(
        { hook_event_name: 'postToolUse' },
        envOf(refusedRoot, { LIVE_URL: 'http://127.0.0.1:9', LIVE_ACTIVITY_KEY: KEY }),
      );
      rmSync(refusedRoot, { recursive: true, force: true });
      expect(refused.status).toBe(0);
      assertQuiet(refused.stdout, refused.stderr);

      const missing = [
        envOf(root, { LIVE_ACTIVITY_KEY: KEY }),
        envOf(root, { LIVE_URL: denied.url }),
        envOf(root, { LIVE_URL: denied.url, LIVE_ACTIVITY_KEY: KEY, CURSOR_AGENT: '' }),
        envOf(root, { LIVE_URL: denied.url, LIVE_ACTIVITY_KEY: KEY, CURSOR_CONVERSATION_ID: 'not-a-cloud-id' }),
      ];
      const before = denied.hits.length;
      for (const env of missing) {
        const skipped = await run({ hook_event_name: 'postToolUse', tool_input: { note: KEY } }, env);
        expect(skipped.status).toBe(0);
        assertQuiet(skipped.stdout, skipped.stderr);
      }
      expect(denied.hits).toHaveLength(before);
    } finally {
      await denied.close();
      await hung.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('resumes the running head and posts finished only to /activity', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloud-activity-head-'));
    const init = spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
    expect(init.status).toBe(0);
    const committed = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 't'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(committed.status).toBe(0);
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    const sha = (head.stdout || '').trim();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    const board = await listen(202);
    const other = 'bc-other-head-agent';
    const seatKey = 'seat-key-not-for-activity';
    const appToken = 'ghs_should_not_appear';
    try {
      const env = envOf(root, {
        LIVE_URL: board.url,
        LIVE_ACTIVITY_KEY: KEY,
        SEAT_KEYS: seatKey,
        GITHUB_TOKEN: appToken,
      });
      const first = await run({ hook_event_name: 'postToolUse' }, env);
      expect(first.status).toBe(0);
      assertQuiet(first.stdout, first.stderr);
      expect(board.hits).toHaveLength(1);
      expect(board.hits[0]?.url).toBe('/activity');
      expect(board.hits[0]?.auth).toBe('Bearer ' + KEY);
      const launch = JSON.parse(board.hits[0]?.body || '{}') as Record<string, string>;
      expect(launch).toMatchObject({ kind: 'cloud_agent', action: 'launch', agent: AGENT, tag: sha });
      expect(launch.seat).toBeUndefined();
      const blocked = await run({ hook_event_name: 'postToolUse' }, { ...env, CURSOR_CONVERSATION_ID: other });
      expect(blocked.status).toBe(0);
      assertQuiet(blocked.stdout, blocked.stderr);
      expect(board.hits).toHaveLength(1);
      const stopped = await run({ hook_event_name: 'stop', status: 'error' }, env);
      expect(stopped.status).toBe(0);
      assertQuiet(stopped.stdout, stopped.stderr);
      const finished = JSON.parse(board.hits[1]?.body || '{}') as Record<string, string>;
      expect(finished).toMatchObject({ kind: 'cloud_agent', action: 'finished', agent: AGENT, tag: sha });
      expect(finished.action).not.toBe('cancel');
      const resumed = await run({ hook_event_name: 'sessionStart' }, env);
      expect(resumed.status).toBe(0);
      assertQuiet(resumed.stdout, resumed.stderr);
      const again = JSON.parse(board.hits[2]?.body || '{}') as Record<string, string>;
      expect(again).toMatchObject({ action: 'launch', agent: AGENT, tag: sha });
      const text = board.hits.map((hit) => hit.url + hit.body + hit.auth).join('\n') + stopped.stdout + stopped.stderr;
      expect(text).not.toContain('run_end');
      expect(text).not.toContain('/inbox');
      expect(text).not.toContain(seatKey);
      expect(text).not.toContain(appToken);
      expect(board.hits.every((hit) => hit.url === '/activity')).toBe(true);
    } finally {
      await board.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('retries a launch that did not land and does not resume a stale head stamp', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloud-activity-stale-'));
    expect(spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' }).status).toBe(0);
    expect(spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 't'], {
      cwd: root,
      encoding: 'utf8',
    }).status).toBe(0);
    const board = await listen(202);
    const other = 'bc-other-head-agent';
    try {
      const env = envOf(root, { LIVE_URL: board.url, LIVE_ACTIVITY_KEY: KEY });
      const first = await run({ hook_event_name: 'postToolUse' }, env);
      expect(first.status).toBe(0);
      assertQuiet(first.stdout, first.stderr);
      expect(board.hits).toHaveLength(1);
      const stamp = path.join(root, '.xray/state/cloud-activity', AGENT);
      const old = new Date(Date.now() - 7 * 60 * 60 * 1000);
      utimesSync(stamp, old, old);
      const next = await run({ hook_event_name: 'postToolUse' }, { ...env, CURSOR_CONVERSATION_ID: other });
      expect(next.status).toBe(0);
      assertQuiet(next.stdout, next.stderr);
      expect(board.hits).toHaveLength(2);
      const launch = JSON.parse(board.hits[1]?.body || '{}') as Record<string, string>;
      expect(launch).toMatchObject({ kind: 'cloud_agent', action: 'launch', agent: other });
    } finally {
      await board.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
