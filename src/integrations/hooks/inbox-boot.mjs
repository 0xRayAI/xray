/**
 * One inbox poll when Grok session start has no live watcher.
 * Grok reads a session-start systemMessage. It does not receive a webhook.
 * A hook http call leaves this machine. A detached loop is not a session event.
 * The poll uses the suit board and the sole seat key. It does not ack.
 * Its pid file is a scratch file, so a live watcher pid stays the watcher.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suitConfig } from './bifrost-send.mjs';

const CAP = 3500;
const TIMEOUT_MS = 12000;
const PREFACE = 'Inbox. Ack a line only after that work is done. A station nudge stays until station has run.';

export function inboxWatchScript(env = process.env) {
  const fromEnv = typeof env.XRAY_AI_PATH === 'string' ? env.XRAY_AI_PATH.trim() : '';
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [];
  if (fromEnv) candidates.push(path.join(fromEnv, 'house/live/tools/inbox-watch.sh'));
  candidates.push(path.resolve(here, '../../../house/live/tools/inbox-watch.sh'));
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return file;
    } catch {
      /* try the next copy */
    }
  }
  return '';
}

export function watcherPidFile(env = {}, home = '') {
  if (typeof env.INBOX_WATCH_PID === 'string' && env.INBOX_WATCH_PID.trim()) {
    return env.INBOX_WATCH_PID.trim();
  }
  const root = home || (typeof env.HOME === 'string' && env.HOME.trim()) || os.homedir();
  return path.join(root, '.burst', 'inbox-watch.pid');
}

export function watcherAlive(pidFile) {
  let text = '';
  try {
    text = fs.readFileSync(pidFile, 'utf8');
  } catch {
    return false;
  }
  const pid = Number(String(text).trim().split(/\s+/)[0]);
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return !!(err && err.code === 'EPERM');
  }
}

export function formatInboxMessage(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) return '';
  const joined = `${PREFACE}\n${lines.join('\n')}`;
  if (joined.length <= CAP) return joined;
  return `${joined.slice(0, CAP - 2).trimEnd()}\n…`;
}

function delivered(text) {
  return /^(ACTION_REQUIRED|FAIL|held:|unfinished:|auto-ack |open )/m.test(String(text || ''));
}

export async function pollInboxOnce(opts = {}) {
  const env = opts.env || {};
  const home = typeof opts.home === 'string' && opts.home.trim()
    ? opts.home.trim()
    : ((typeof env.HOME === 'string' && env.HOME.trim()) || os.homedir());
  const pidFile = opts.pidFile || watcherPidFile(env, home);
  if (opts.force !== true && watcherAlive(pidFile)) return '';
  const cfg = suitConfig(env, home);
  if (!cfg) return '';
  const script = opts.script || inboxWatchScript(env);
  if (!script || !fs.existsSync(script)) return '';
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : TIMEOUT_MS;
  const ownScratch = !opts.scratch;
  const scratch = opts.scratch || fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-boot-'));
  fs.mkdirSync(scratch, { recursive: true });
  const childEnv = { ...env, HOME: home };
  childEnv.INBOX_WATCH_ONCE = '1';
  childEnv.INBOX_WATCH_PID = path.join(scratch, 'pid');
  childEnv.INBOX_WATCH_STATE = path.join(scratch, 'state');
  childEnv.LIVE_INBOX_TIMEOUT = String(Math.max(1, Math.floor(timeoutMs / 1000) - 2));
  childEnv.LIVE_URL = cfg.origin;
  childEnv.SEAT_KEYS_DIR = cfg.keys;
  delete childEnv.LIVE_INBOX;
  const spawnImpl = opts.spawnImpl || spawn;
  const text = await new Promise((resolve) => {
    let out = '';
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    let child;
    try {
      child = spawnImpl(script, [cfg.seat], {
        env: childEnv,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      finish('');
      return;
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
      finish(delivered(out) ? out : '');
    }, timeoutMs);
    if (child.stdout) {
      child.stdout.on('data', (buf) => {
        out += buf.toString('utf8');
        if (out.length > 16000) out = out.slice(0, 16000);
      });
    }
    child.on('error', () => finish(''));
    child.on('close', () => finish(out));
  });
  if (ownScratch) {
    try {
      fs.rmSync(scratch, { recursive: true, force: true });
    } catch {
      /* scratch is disposable */
    }
  }
  return formatInboxMessage(text);
}
