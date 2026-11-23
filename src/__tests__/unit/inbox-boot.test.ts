import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  composeInboxMessage,
  formatInboxMessage,
  inboxStartOrder,
  inboxStopDecision,
  pollInboxOnce,
  watcherAlive,
} from '../../integrations/hooks/inbox-boot.mjs';

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
    const ordered = composeInboxMessage(`ACTION_REQUIRED\n${'x'.repeat(5000)}`, 'Start the inbox monitor before other work.\nCommand: go');
    expect(ordered.length).toBeLessThanOrEqual(3500);
    expect(ordered).toContain('ACTION_REQUIRED');
    expect(ordered.endsWith('Command: go')).toBe(true);
  });

  it('treats a dead pid as absent and a live pid as the watcher', () => {
    const home = tmp('inbox-boot-pid-');
    const pidFile = path.join(home, 'inbox-watch.pid');
    fs.writeFileSync(pidFile, '99999999\n');
    expect(watcherAlive(pidFile)).toBe(false);
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    expect(watcherAlive(pidFile)).toBe(true);
  });

  it('names a live pid and does not start the script', async () => {
    const home = tmp('inbox-boot-live-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const pidFile = path.join(home, 'pid');
    const stateFile = path.join(home, 'inbox-watch.state');
    const marker = path.join(home, 'ran');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    fs.writeFileSync(stateFile, 'session=this-session\n');
    const file = script(home, `#!/bin/sh\nprintf ran > '${marker}'\nprintf 'ACTION_REQUIRED\\n'\n`);
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      stateFile,
      sessionId: 'this-session',
      script: file,
    });
    expect(text).toContain('Start the inbox monitor in this CLI');
    expect(text).toContain('Call the monitor tool');
    expect(text).toContain('Do not spawn a detached process.');
    expect(text).toContain(`Stop inbox-watch pid ${process.pid}`);
    expect(text).not.toContain('ACTION_REQUIRED');
    expect(fs.existsSync(marker)).toBe(false);
    expect(fs.readFileSync(pidFile, 'utf8').trim()).toBe(String(process.pid));
    const wake = fs.readFileSync(path.join(home, '.burst', 'inbox-wake', 'arch1'), 'utf8').trim();
    expect(wake.length).toBeGreaterThan(0);
  });

  it('returns empty when the seat key or the script is missing', async () => {
    const home = tmp('inbox-boot-off-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    const quiet = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile: path.join(home, 'absent.pid'),
    });
    expect(quiet).toBe('');
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const missing = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example', XRAY_AI_PATH: home },
      home,
      pidFile: path.join(home, 'absent.pid'),
      script: path.join(home, 'no-such-watch.sh'),
    });
    expect(missing).toBe('');
    expect(fs.existsSync(path.join(home, '.burst', 'inbox-wake', 'arch1'))).toBe(false);
  });

  it('does not run the watch and keeps the pid file', async () => {
    const home = tmp('inbox-boot-once-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const marker = path.join(home, 'marker');
    const file = script(
      home,
      `#!/bin/sh
printf ran > '${marker}'
printf 'ACTION_REQUIRED\\nunfinished:1\\n'
`,
    );
    const livePid = path.join(home, 'live.pid');
    fs.writeFileSync(livePid, '99999999\n');
    const started = Date.now();
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, LIVE_URL: 'https://bifrost.example', LIVE_INBOX: '/tmp/do-not-use' },
      home,
      pidFile: livePid,
      script: file,
      timeoutMs: 200,
    });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(text).toContain('Start the inbox monitor in this CLI');
    expect(text).toContain('Call the monitor tool');
    expect(text).toContain('Do not spawn a detached process.');
    expect(text).not.toContain('ACTION_REQUIRED');
    expect(text).not.toContain('Inbox watch is running.');
    expect(text).not.toContain('not-a-real-key');
    expect(text).not.toContain('Stop inbox-watch pid');
    expect(fs.existsSync(marker)).toBe(false);
    expect(fs.readFileSync(livePid, 'utf8').trim()).toBe('99999999');
  });

  it('orders the CLI monitor when the pid is dead and does not start the script', async () => {
    const home = tmp('inbox-boot-order-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const marker = path.join(home, 'ran');
    const file = script(home, `#!/bin/sh\nprintf ran > '${marker}'\nprintf 'ACTION_REQUIRED\\n'\n`);
    const pidFile = path.join(home, 'absent.pid');
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example', GROK_SESSION_ID: 'sess-1' },
      home,
      pidFile,
      script: file,
      sessionId: 'sess-1',
    });
    expect(text).toContain('Start the inbox monitor in this CLI');
    expect(text).toContain('Command:');
    expect(text).toContain('Do not spawn a detached process.');
    expect(text).not.toContain('Inbox watch is running.');
    expect(text).not.toContain('ACTION_REQUIRED');
    expect(text).not.toContain('not-a-real-key');
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('prints the start command when the hook cannot spawn the watch', async () => {
    const home = tmp('inbox-boot-fallback-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const text = await pollInboxOnce({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile: path.join(home, 'absent.pid'),
      script: file,
    });
    expect(text).toContain('Start the inbox monitor in this CLI before other work.');
    expect(text).toContain('One copy. Persistent.');
    expect(text).toContain('Call the monitor tool with this command.');
    expect(text).toContain('Do not spawn a detached process.');
    expect(text).toContain(`'${file}'`);
    expect(text).toContain(`'arch1'`);
    expect(text).not.toContain('not-a-real-key');
  });

  it('a stop blocks until this CLI has the inbox monitor', () => {
    const home = tmp('inbox-boot-stop-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const blocked = inboxStopDecision({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      script: file,
      backgroundTasks: [{ type: 'shell', command: 'sleep 1' }],
    });
    expect(blocked && blocked.decision).toBe('block');
    expect(blocked && blocked.reason).toContain('Call the monitor tool');
    expect(blocked && blocked.reason).toContain('Do not spawn a detached process.');
    const open = inboxStopDecision({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      script: file,
      backgroundTasks: [{ type: 'monitor', description: `${file} arch1` }],
    });
    expect(open).toBeNull();
    const continuing = inboxStopDecision({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home: tmp('inbox-boot-stop-active-'),
      script: file,
      sessionId: 'sess-stop',
      stopHookActive: true,
    });
    expect(continuing).toBeNull();
  });

  it('a second stop in the same session ends the turn', () => {
    const home = tmp('inbox-boot-stop-once-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const opts = {
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      script: file,
      sessionId: 'sess-once',
    };
    const first = inboxStopDecision(opts);
    expect(first && first.decision).toBe('block');
    expect(first && first.reason).toContain('Call the monitor tool');
    const second = inboxStopDecision(opts);
    expect(second).toBeNull();
  });

  it('a prompt orders the CLI monitor and names an outside pid', () => {
    const home = tmp('inbox-boot-prompt-start-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const pidFile = path.join(home, 'absent.pid');
    const started = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      script: file,
    });
    expect(started).toContain('Start the inbox monitor in this CLI');
    expect(started).toContain('Do not spawn a detached process.');
    expect(started).not.toContain('Stop inbox-watch pid');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    const outside = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      script: file,
    });
    expect(outside).toContain(`Stop inbox-watch pid ${process.pid}`);
    const quiet = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      script: file,
      backgroundTasks: [{ type: 'monitor', description: 'inbox-watch.sh arch1' }],
    });
    expect(quiet).toBe('');
  });

  it('stays quiet when this session already hears inbox-watch', () => {
    const home = tmp('inbox-boot-heard-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const pidFile = path.join(home, 'inbox-watch.pid');
    const stateFile = path.join(home, 'inbox-watch.state');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    fs.writeFileSync(stateFile, 'session=sess-heard\n');
    const heard = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      stateFile,
      script: file,
      sessionId: 'sess-heard',
      inspectProcess: () => ({ parent: 50, command: `${file} arch1` }),
    });
    expect(heard).toBe('');
    const detached = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      stateFile,
      script: file,
      sessionId: 'sess-heard',
      inspectProcess: () => ({ parent: 1, command: `${file} arch1` }),
    });
    expect(detached).toContain(`Stop inbox-watch pid ${process.pid}`);
    expect(detached).toContain('Call the monitor tool');
  });

  it('stays quiet when the parent command carries this session', () => {
    const home = tmp('inbox-boot-parent-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const file = script(home, '#!/bin/sh\nexit 0\n');
    const pidFile = path.join(home, 'inbox-watch.pid');
    const stateFile = path.join(home, 'inbox-watch.state');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    fs.writeFileSync(stateFile, 'pid=1\n');
    const heard = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      stateFile,
      script: file,
      sessionId: 'sess-heard',
      inspectProcess: (pid: number) => {
        if (pid === process.pid) return { parent: 50, command: `${file} arch1` };
        if (pid === 50) return { parent: 40, command: `INBOX_WATCH_SESSION='sess-heard' ${file} arch1` };
        return { parent: 0, command: '' };
      },
    });
    expect(heard).toBe('');
    const other = inboxStartOrder({
      env: { SEAT_KEYS_DIR: keys, XRAY_SEAT: 'arch1', LIVE_URL: 'https://bifrost.example' },
      home,
      pidFile,
      stateFile,
      script: file,
      sessionId: 'sess-heard',
      inspectProcess: (pid: number) => {
        if (pid === process.pid) return { parent: 50, command: `${file} arch1` };
        if (pid === 50) return { parent: 40, command: `INBOX_WATCH_SESSION='other-session' ${file} arch1` };
        return { parent: 0, command: '' };
      },
    });
    expect(other).toContain(`Stop inbox-watch pid ${process.pid}`);
  });

  it('orders the CLI monitor on session start and does not run the script', () => {
    const project = tmp('inbox-boot-session-');
    const home = tmp('inbox-boot-session-home-');
    const machine = tmp('inbox-boot-session-machine-');
    const pack = tmp('inbox-boot-pack-');
    const keys = path.join(home, 'keys');
    fs.mkdirSync(keys);
    fs.writeFileSync(path.join(keys, 'arch1.key'), 'not-a-real-key\n', { mode: 0o600 });
    const tools = path.join(pack, 'house', 'live', 'tools');
    const marker = path.join(home, 'ran');
    fs.mkdirSync(tools, { recursive: true });
    fs.writeFileSync(
      path.join(tools, 'inbox-watch.sh'),
      `#!/bin/sh\nprintf ran > '${marker}'\nprintf 'ACTION_REQUIRED\\nunfinished:1\\n'\n`,
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
    expect(out.systemMessage).toContain('Start the inbox monitor in this CLI');
    expect(out.systemMessage).toContain('Call the monitor tool');
    expect(out.systemMessage).toContain('Do not spawn a detached process.');
    expect(out.systemMessage).not.toContain('ACTION_REQUIRED');
    expect(out.systemMessage).not.toContain('Inbox watch is running.');
    expect(fs.existsSync(marker)).toBe(false);
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
    expect(promptOut.systemMessage).toContain('Start the inbox monitor in this CLI');
    expect(promptOut.systemMessage).toContain('Call the monitor tool');
    expect(promptOut.systemMessage).not.toContain('Inbox watch is running.');
    expect(promptOut.systemMessage).not.toContain('ACTION_REQUIRED');
  });

  it('a second copy exits when the pid file is live and does not poll', () => {
    const home = tmp('inbox-watch-one-');
    const pidFile = path.join(home, 'inbox-watch.pid');
    const marker = path.join(home, 'polled');
    const stub = path.join(home, 'live-inbox');
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    fs.writeFileSync(stub, `#!/bin/sh\nprintf polled > '${marker}'\n`, { mode: 0o755 });
    const watch = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../house/live/tools/inbox-watch.sh',
    );
    const env = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      INBOX_WATCH_PID: pidFile,
      INBOX_WATCH_STATE: path.join(home, 'state'),
      INBOX_WAKE_DIR: path.join(home, 'wake'),
      LIVE_INBOX: stub,
      LIVE_URL: 'http://127.0.0.1:9',
      SEAT_KEYS_DIR: home,
      INBOX_WATCH_ONCE: '1',
    };
    const held = spawnSync(watch, ['arch1'], { env, encoding: 'utf8', timeout: 5000 });
    expect(held.status).toBe(0);
    expect(fs.existsSync(marker)).toBe(false);
    expect(fs.readFileSync(pidFile, 'utf8').trim()).toBe(String(process.pid));
    fs.writeFileSync(pidFile, '99999999\n');
    const taken = spawnSync(watch, ['arch1'], { env, encoding: 'utf8', timeout: 5000 });
    expect(taken.status).toBe(0);
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.readFileSync(pidFile, 'utf8').trim()).not.toBe('99999999');
  });

  it('a prompt names an outside pid and stays quiet when the CLI monitor is up', () => {
    const project = tmp('inbox-boot-prompt-live-');
    const home = tmp('inbox-boot-prompt-live-home-');
    const machine = tmp('inbox-boot-prompt-live-machine-');
    const pidFile = path.join(home, '.burst', 'inbox-watch.pid');
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, `${process.pid}\n`);
    fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
    const hook = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../integrations/grok/hooks/session-start.js',
    );
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
        INBOX_WATCH_PID: pidFile,
        XRAY_SEAT: 'arch1',
      },
    });
    expect(prompt.status).toBe(0);
    const promptOut = JSON.parse(prompt.stdout) as { systemMessage?: string };
    expect(promptOut.systemMessage).toContain(`Stop inbox-watch pid ${process.pid}`);
    expect(promptOut.systemMessage).toContain('Call the monitor tool');
    const wakeFile = path.join(home, '.burst', 'inbox-wake', 'arch1');
    const wake = fs.readFileSync(wakeFile, 'utf8');
    const heard = spawnSync(process.execPath, [hook, '--hook-event=stop'], {
      cwd: project,
      input: JSON.stringify({
        workspaceRoot: project,
        cwd: project,
        hookEventName: 'Stop',
        backgroundTasks: [{ type: 'monitor', description: 'house/live/tools/inbox-watch.sh arch1' }],
      }),
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        FOUNDRY_MACHINE_HOME: machine,
        INBOX_WATCH_PID: pidFile,
        XRAY_SEAT: 'arch1',
      },
    });
    expect(heard.status).toBe(0);
    expect(heard.stdout.trim()).toBe('');
    expect(fs.readFileSync(wakeFile, 'utf8')).toBe(wake);
  });
});
