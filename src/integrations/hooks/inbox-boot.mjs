/**
 * The order to start the CLI monitor.
 * The monitor tool is the only watch this chat can hear.
 * The hook never starts inbox-watch.sh. A child process is not heard here.
 * A pid outside this CLI is named so the seat can stop it. One monitor. One copy.
 * Session start still writes one wake token when it prints that order.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suitConfig } from './bifrost-send.mjs';

const CAP = 3500;
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

export function recordInboxWake(home, seat) {
  const name = String(seat || '').trim();
  if (!/^[a-z0-9-]{2,16}$/.test(name)) return '';
  const dir = path.join(home, '.burst', 'inbox-wake');
  fs.mkdirSync(dir, { recursive: true });
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(path.join(dir, name), `${token}\n`, { mode: 0o600 });
  return token;
}

export function watcherPid(pidFile) {
  let text = '';
  try {
    text = fs.readFileSync(pidFile, 'utf8');
  } catch {
    return 0;
  }
  const pid = Number(String(text).trim().split(/\s+/)[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : 0;
}

export function watcherAlive(pidFile) {
  const pid = watcherPid(pidFile);
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return !!(err && err.code === 'EPERM');
  }
}

export function watcherSession(stateFile) {
  let text = '';
  try {
    text = fs.readFileSync(stateFile, 'utf8');
  } catch {
    return '';
  }
  const line = text.split('\n').find((row) => row.startsWith('session='));
  return line ? line.slice('session='.length).trim() : '';
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

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/** This chat hears a monitor. A detached process does not count. */
export function sessionHasInboxMonitor(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  return list.some((task) => {
    if (!task || String(task.type) !== 'monitor') return false;
    const text = `${task.description || ''} ${task.command || ''}`;
    return text.includes('inbox-watch.sh');
  });
}

/** Parent and command of a pid. A miss is an empty command and parent 0. */
export function watchProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return { parent: 0, command: '' };
  try {
    const out = execFileSync('ps', ['-o', 'ppid=,command=', '-p', String(pid)], {
      encoding: 'utf8',
      timeout: 1000,
    });
    const match = /^(\d+)\s+([\s\S]*)$/.exec(String(out).trim());
    if (!match) return { parent: 0, command: '' };
    return { parent: Number(match[1]) || 0, command: match[2] || '' };
  } catch {
    return { parent: 0, command: '' };
  }
}

/**
 * True when this session's inbox-watch is already heard.
 * A prompt does not receive the monitor list. The pid file, the session
 * line, and a parent other than pid 1 are the proof. Pid 1 is detached.
 */
export function inboxMonitorHeard(opts, pidFile, stateFile) {
  if (sessionHasInboxMonitor(opts.backgroundTasks)) return true;
  const env = opts.env || {};
  const sessionId = String(opts.sessionId || env.GROK_SESSION_ID || '').trim();
  if (!sessionId || watcherSession(stateFile) !== sessionId) return false;
  const pid = watcherAlive(pidFile) ? watcherPid(pidFile) : 0;
  if (!pid) return false;
  const looked = typeof opts.inspectProcess === 'function' ? opts.inspectProcess(pid) : watchProcess(pid);
  const parent = Number(looked && looked.parent) || 0;
  const command = String((looked && looked.command) || '');
  return parent > 1 && command.includes('inbox-watch.sh');
}

/** The seat calls the monitor tool. The hook does not spawn. */
export function cliMonitorOrder(script, seat, origin, keys, sessionId, externalPid) {
  const session = sessionId ? ` INBOX_WATCH_SESSION=${shQuote(sessionId)}` : '';
  const command = `LIVE_URL=${shQuote(origin)} SEAT_KEYS_DIR=${shQuote(keys)}${session} ${shQuote(script)} ${shQuote(seat)}`;
  const lines = [
    'Start the inbox monitor in this CLI before other work. One copy. Persistent.',
    'Call the monitor tool with this command. This chat hears its lines.',
    'Do not spawn a detached process.',
  ];
  if (externalPid) {
    lines.push(`Stop inbox-watch pid ${externalPid}. This chat cannot hear it.`);
  }
  lines.push(`Command: ${command}`);
  return lines.join('\n');
}

function inboxOrder(opts, cfg, script) {
  const env = opts.env || {};
  const home = typeof opts.home === 'string' && opts.home.trim()
    ? opts.home.trim()
    : ((typeof env.HOME === 'string' && env.HOME.trim()) || os.homedir());
  const pidFile = opts.pidFile || watcherPidFile(env, home);
  const sessionId = String(opts.sessionId || env.GROK_SESSION_ID || '').trim();
  const externalPid = watcherAlive(pidFile) ? watcherPid(pidFile) : 0;
  recordInboxWake(home, cfg.seat);
  return cliMonitorOrder(script, cfg.seat, cfg.origin, cfg.keys, sessionId, externalPid);
}

/** Order the CLI monitor. No poll. An outside pid does not count as the monitor. */
export function inboxStartOrder(opts = {}) {
  const env = opts.env || {};
  const home = typeof opts.home === 'string' && opts.home.trim()
    ? opts.home.trim()
    : ((typeof env.HOME === 'string' && env.HOME.trim()) || os.homedir());
  const pidFile = opts.pidFile || watcherPidFile(env, home);
  const stateFile = opts.stateFile || path.join(path.dirname(pidFile), 'inbox-watch.state');
  if (inboxMonitorHeard(opts, pidFile, stateFile)) return '';
  const cfg = suitConfig(env, home);
  if (!cfg) return '';
  const script = opts.script || inboxWatchScript(env);
  if (!script || !fs.existsSync(script)) return '';
  return inboxOrder(opts, cfg, script);
}

/** Stop stays blocked until this CLI has the inbox monitor. */
export function inboxStopDecision(opts = {}) {
  const reason = inboxStartOrder(opts);
  if (!reason) return null;
  return { decision: 'block', reason };
}

export function composeInboxMessage(pollText, order) {
  const poll = formatInboxMessage(pollText);
  const tail = String(order || '').trim();
  if (!tail) return poll;
  const clipped = tail.length <= CAP ? tail : `${tail.slice(0, CAP - 2).trimEnd()}\n…`;
  if (!poll) return clipped;
  const extra = `\n${clipped}`;
  if (poll.length + extra.length <= CAP) return `${poll}${extra}`;
  const room = CAP - extra.length;
  if (room < 40) return clipped;
  return `${poll.slice(0, room - 2).trimEnd()}\n…${extra}`;
}

/** Session start orders the CLI monitor. It does not run inbox-watch.sh. */
export function pollInboxOnce(opts = {}) {
  return inboxStartOrder(opts);
}
