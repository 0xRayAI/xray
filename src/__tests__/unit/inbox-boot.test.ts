import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatInboxMessage, pollInboxOnce, watcherAlive } from '../../integrations/hooks/inbox-boot.mjs';

const dirs: string[] = [];

function tmp(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

function script(dir: string, body: string) {
  const file = path.join(dir, 'inbox-watch.sh');
  fs.writeFileSync(file, body, { mode: 0o755 });
  return file;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('inbox boot', () => {
  it('formats a short poll and caps a long one', () => {
    expect(formatInboxMessage('  \n')).toBe('');
    expect(formatInboxMessage('ACTION_REQUIRED\nunfinished:1\n')).toContain('ACTION_REQUIRED');
    expect(formatInboxMessage('ACTION_REQUIRED\nunfinished:1\n')).toContain('station nudge');
    const long = formatInboxMessage(`ACTION_REQUIRED\n${'x'.repeat(5000)}`);
    expect(long.length).toBeLessThanOrEqual(3500);
    expect(long.endsWith('…')).toBe(true);
  });

  it('treats a dead pid as absent and a live pid as the watcher', () => {
    const home = tmp('inbox-boot-pid-');
    const pidFile = path.join(home, 'inbox-watch.pid');
    fs.writeFileSync(pidFile, '99999999\n');
    expect(watcherAlive(pidFile)).toBe(false);
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    expect(watcherAlive(pidFile)).toBe(true);
  });

  it('skips the poll while a watcher pid is alive', async () => {
    const home = tmp('inbox-boot-live-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const pidFile = path.join(home, 'pid');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    let spawned = false;
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      script: path.join(home, 'missing.sh'),
      spawnImpl: () => {
        spawned = true;
        throw new Error('spawned');
      },
    });
    expect(text).toBe('');
    expect(spawned).toBe(false);
  });

  it('returns empty when the seat key or the script is missing', async () => {
    const home = tmp('inbox-boot-off-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    const quiet = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile: path.join(home, 'absent.pid'),
      spawnImpl: () => {
        throw new Error('spawned');
      },
    });
    expect(quiet).toBe('');
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const missing = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example', XRAY_AI_PATH: home },
      home,
      pidFile: path.join(home, 'absent.pid'),
      script: path.join(home, 'no-such-watch.sh'),
      spawnImpl: () => {
        throw new Error('spawned');
      },
    });
    expect(missing).toBe('');
  });

  it('runs the watch once, keeps the live pid file, and returns the lines', async () => {
    const home = tmp('inbox-boot-once-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const scratch = path.join(home, 'scratch');
    fs.mkdirSync(scratch);
    const marker = path.join(home, 'marker');
    const file = script(
      home,
      `#!/bin/sh
printf '%s\\n' "$1" > "${marker}.seat"
printf '%s\\n' "$INBOX_WATCH_ONCE" > "${marker}.once"
printf '%s\\n' "$INBOX_WATCH_PID" > "${marker}.pid"
printf '%s\\n' "$LIVE_URL" > "${marker}.url"
printf 'ACTION_REQUIRED\\nunfinished:1\\n'
`,
    );
    const livePid = path.join(home, 'live.pid');
    fs.writeFileSync(livePid, '99999999\n');
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, LIVE_URL: 'https://bifrost.example', LIVE_INBOX: '/tmp/do-not-use' },
      home,
      pidFile: livePid,
      script: file,
      scratch,
    });
    expect(text).toContain('ACTION_REQUIRED');
    expect(text).toContain('unfinished:1');
    expect(fs.readFileSync(`${marker}.seat`, 'utf8').trim()).toBe('arch1');
    expect(fs.readFileSync(`${marker}.once`, 'utf8').trim()).toBe('1');
    expect(fs.readFileSync(`${marker}.url`, 'utf8').trim()).toBe('https://bifrost.example');
    const usedPid = fs.readFileSync(`${marker}.pid`, 'utf8').trim();
    expect(usedPid).toBe(path.join(scratch, 'pid'));
    expect(usedPid).not.toBe(livePid);
    expect(fs.readFileSync(livePid, 'utf8').trim()).toBe('99999999');
  });

  it('drops a poll that does not finish and does not surface a partial miss', async () => {
    const home = tmp('inbox-boot-slow-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nsleep 30\n');
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile: path.join(home, 'absent.pid'),
      script: file,
      timeoutMs: 200,
    });
    expect(text).toBe('');
  });

  it('puts the once-poll on session start stdout and leaves the boot file without it', () => {
    const project = tmp('inbox-boot-session-');
    const home = tmp('inbox-boot-session-home-');
    const machine = tmp('inbox-boot-session-machine-');
    const pack = tmp('inbox-boot-pack-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const tools = path.join(pack, 'house', 'live', 'tools');
    fs.mkdirSync(tools, { recursive: true });
    fs.writeFileSync(
      path.join(tools, 'inbox-watch.sh'),
      '#!/bin/sh\nprintf \'ACTION_REQUIRED\\nunfinished:1\\n\'\n',
      { mode: 0o755 },
    );
    fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
    const hook = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../integrations/grok/hooks/session-start.js',
    );
    const ran = spawnSync(process.execPath, [hook], {
      cwd: project,
      input: JSON.stringify({
        workspaceRoot: project,
        cwd: project,
        hookEventName: 'SessionStart',
        prompt: 'inbox',
      }),
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        FOUNDRY_MACHINE_HOME: machine,
        XRAY_AI_PATH: pack,
        XRAY_SEAT: 'arch1',
        SEAT_KEYS_DIR: keys,
        LIVE_URL: 'http://127.0.0.1:9',
      },
    });
    expect(ran.status).toBe(0);
    const out = JSON.parse(ran.stdout) as { systemMessage?: string };
    expect(out.systemMessage).toContain('ACTION_REQUIRED');
    const boot = fs.readFileSync(path.join(project, '.xray/state/session-boot.json'), 'utf8');
    expect(boot).not.toContain('systemMessage');
    const prompt = spawnSync(process.execPath, [hook, '--hook-event=user_prompt_submit'], {
      cwd: project,
      input: JSON.stringify({
        workspaceRoot: project,
        cwd: project,
        hookEventName: 'UserPromptSubmit',
        prompt: 'inbox',
      }),
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        FOUNDRY_MACHINE_HOME: machine,
        XRAY_AI_PATH: pack,
        XRAY_SEAT: 'arch1',
        SEAT_KEYS_DIR: keys,
        LIVE_URL: 'http://127.0.0.1:9',
      },
    });
    expect(prompt.status).toBe(0);
    const promptOut = JSON.parse(prompt.stdout) as { systemMessage?: string };
    expect(promptOut.systemMessage).toBeUndefined();
  });
});
