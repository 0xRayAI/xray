/**
 * Cursor Cloud real-usage receipt — no delegation-gate / dist required.
 * FILL / chars÷4 is never usage proof. Host fields or Cloud MCP / dashboard only.
 */

import fs from 'fs';
import path from 'path';
import { buildRepertoireResume } from '../../hooks/station-hook-runtime.mjs';

export const EVENT_CLASS_HOST = 'cursor-host-precompact';
export const EVENT_CLASS_FAIL = 'cursor-host-precompact-FAIL';

export const FORBIDDEN_USAGE_METHODS = new Set([
  'chars-div-4',
  'chars/4',
  'chars÷4',
  'fill-only',
  'fill',
  'utf8-bytes-div-4',
  'bytes-div-4',
]);

export function invokeProbeLogPath(root) {
  return path.join(root, '.xray', 'state', 'cursor-hook-invoke.log');
}

export function cursorUsageReceiptPath(root) {
  return path.join(root, '.xray', 'state', 'cursor-usage-receipt.json');
}

/** Proof log. A cut is greppable here; cursor-hook-invoke.log has no session id. */
export function cursorHookLogPath(root) {
  return path.join(root, '.xray', 'state', 'cursor-hook.log');
}

function logToken(value) {
  if (value == null) return '';
  return String(value).replace(/[\r\n]+/g, '');
}

/**
 * Safe filename segment for `.xray/state/cursor-receipts/<id>.json`.
 * Empty when the id cannot be kept inside that directory.
 */
export function sanitizeSessionReceiptId(sessionId) {
  const raw = typeof sessionId === 'string' ? sessionId.trim() : '';
  if (!raw) return '';
  const safe = raw
    .replace(/\0/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .replace(/[._]+$/g, '');
  if (!safe || safe === '.' || safe === '..') return '';
  return safe.slice(0, 180);
}

export function cursorSessionReceiptPath(root, sessionId) {
  const safe = sanitizeSessionReceiptId(sessionId);
  if (!safe) return null;
  return path.join(root, '.xray', 'state', 'cursor-receipts', `${safe}.json`);
}

/**
 * Append one preCompact proof line. True only when the append landed and
 * the file contains that session id (grep of *.log can find the cut).
 */
export function appendCursorCompactProofLog(root, fields = {}) {
  const sessionId = logToken(fields.sessionId);
  const timestamp = logToken(fields.timestamp) || new Date().toISOString();
  const line = [
    `ts=${timestamp}`,
    `session_id=${sessionId}`,
    `context_tokens=${logToken(fields.context_tokens)}`,
    `context_usage_percent=${logToken(fields.context_usage_percent)}`,
    `context_window_size=${logToken(fields.context_window_size)}`,
    `generation_id=${logToken(fields.generation_id)}`,
  ].join(' ');
  const dest = cursorHookLogPath(root);
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.appendFileSync(dest, `${line}\n`);
  } catch {
    return false;
  }
  if (!sessionId) return false;
  try {
    return fs.readFileSync(dest, 'utf8').includes(`session_id=${sessionId}`);
  } catch {
    return false;
  }
}

export function parseInvokeProbeLog(root) {
  const dest = invokeProbeLogPath(root);
  const counts = { preToolUse: 0, preCompact: 0, afterFileEdit: 0, unknown: 0 };
  if (!fs.existsSync(dest)) {
    return { exists: false, path: dest, counts, hostPreCompactFired: false };
  }
  let text = '';
  try {
    text = fs.readFileSync(dest, 'utf8');
  } catch {
    return { exists: false, path: dest, counts, hostPreCompactFired: false };
  }
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /(?:^|\s)event=([A-Za-z]+)/.exec(line);
    const event = match ? match[1] : 'unknown';
    if (event === 'preToolUse') counts.preToolUse += 1;
    else if (event === 'preCompact') counts.preCompact += 1;
    else if (event === 'afterFileEdit') counts.afterFileEdit += 1;
    else counts.unknown += 1;
  }
  return {
    exists: true,
    path: dest,
    counts,
    hostPreCompactFired: counts.preCompact > 0,
  };
}

export function hostUsageFromPreCompactEvent(event = {}) {
  const usage = { source: 'precompact-stdin', method: 'host-field' };
  if (typeof event.context_tokens === 'number') usage.context_tokens = event.context_tokens;
  if (typeof event.context_usage_percent === 'number') {
    usage.context_usage_percent = event.context_usage_percent;
  }
  if (typeof event.context_window_size === 'number') {
    usage.context_window_size = event.context_window_size;
  }
  if (typeof event.windowCite === 'string' && event.windowCite) usage.windowCite = event.windowCite;
  if (typeof event.model === 'string' && event.model) usage.model = event.model;
  if (typeof event.bcId === 'string' && event.bcId) usage.bcId = event.bcId;
  else if (typeof event.conversation_id === 'string' && event.conversation_id) {
    usage.bcId = event.conversation_id;
  }
  return usage;
}

function looksLikeFillCite(cite = {}) {
  const method = String(cite.method || '').trim().toLowerCase();
  if (FORBIDDEN_USAGE_METHODS.has(method)) return true;
  if (cite.fillBytes != null || cite.charsDiv4 != null || cite.fillOnly === true) return true;
  return false;
}

function hasHostTokenFields(cite = {}) {
  return (
    typeof cite.context_tokens === 'number' ||
    typeof cite.context_usage_percent === 'number' ||
    typeof cite.context_window_size === 'number'
  );
}

function hasMcpIdentity(cite = {}) {
  const source = String(cite.source || '').trim();
  if (source === 'cursor-cloud-run-info' || source === 'cursor-cloud-events' || source === 'dashboard') {
    return true;
  }
  return Boolean(cite.model || cite.bcId);
}

export function classifyUsageCite(cite = {}) {
  const method = String(cite.method || '').trim().toLowerCase();
  const source = String(cite.source || '').trim() || null;
  const windowCite = typeof cite.windowCite === 'string' && cite.windowCite ? cite.windowCite : null;
  const model = typeof cite.model === 'string' && cite.model ? cite.model : null;
  const bcId = typeof cite.bcId === 'string' && cite.bcId ? cite.bcId : null;
  const tokens = typeof cite.context_tokens === 'number' ? cite.context_tokens : null;
  const percent = typeof cite.context_usage_percent === 'number' ? cite.context_usage_percent : null;
  const windowSize = typeof cite.context_window_size === 'number' ? cite.context_window_size : null;

  if (looksLikeFillCite(cite)) {
    return {
      ok: false,
      forbidden: true,
      miss: false,
      reason: 'FILL / chars÷4 is forbidden as usage proof',
      method: method || 'fill',
      source,
      context_tokens: null,
      context_usage_percent: null,
      context_window_size: null,
      windowCite,
      model,
      bcId,
    };
  }

  if (hasHostTokenFields(cite)) {
    return {
      ok: true,
      forbidden: false,
      miss: false,
      reason: null,
      method: method || 'host-field',
      source: source || 'precompact-stdin',
      context_tokens: tokens,
      context_usage_percent: percent,
      context_window_size: windowSize,
      windowCite,
      model,
      bcId,
    };
  }

  if (hasMcpIdentity(cite)) {
    return {
      ok: true,
      forbidden: false,
      miss: true,
      reason: 'MCP/dashboard identity present; token counts MISS (do not fill)',
      method: method || source || 'mcp',
      source,
      context_tokens: null,
      context_usage_percent: null,
      context_window_size: null,
      windowCite,
      model,
      bcId,
    };
  }

  return {
    ok: false,
    forbidden: false,
    miss: true,
    reason: 'no host/MCP usage fields; do not fill',
    method: method || null,
    source,
    context_tokens: null,
    context_usage_percent: null,
    context_window_size: null,
    windowCite,
    model,
    bcId,
  };
}

export function buildRepertoireFastenedProof(root) {
  const resume = buildRepertoireResume(root);
  const npmPath = path.join(root, 'node_modules', '@0xray', 'repertoire');
  const vendorPath = path.join(root, 'vendor', '@0xray', 'repertoire');
  const pkgFile = fs.existsSync(path.join(npmPath, 'package.json'))
    ? path.join(npmPath, 'package.json')
    : path.join(vendorPath, 'package.json');
  let name = null;
  let version = null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    name = pkg.name || null;
    version = pkg.version || null;
  } catch {
    /* organ absent */
  }
  const providerExists = fs.existsSync(
    path.join(npmPath, 'dist', 'provider', 'memory-routing-provider.js'),
  );
  const signalsExists = fs.existsSync(path.join(npmPath, 'data', 'curated_signals.json'));
  return {
    fastened: name === '@0xray/repertoire' && providerExists,
    resume,
    name,
    version,
    npmPath: fs.existsSync(npmPath) ? npmPath : null,
    vendorPath: fs.existsSync(vendorPath) ? vendorPath : null,
    providerExists,
    signalsExists,
  };
}

export function buildCursorUsageReceipt(root, input = {}) {
  const probe = parseInvokeProbeLog(root);
  const usage = classifyUsageCite(input.usage || {});
  const repertoire = buildRepertoireFastenedProof(root);
  const eventClass =
    typeof input.eventClass === 'string'
      ? input.eventClass
      : probe.hostPreCompactFired
        ? EVENT_CLASS_HOST
        : EVENT_CLASS_FAIL;
  return {
    ok: usage.ok && !usage.forbidden,
    protocol: 'real-work-ab',
    timestamp: new Date().toISOString(),
    sessionId: input.sessionId || null,
    compact: {
      hostFired: probe.hostPreCompactFired,
      preCompactCount: probe.counts.preCompact,
      preToolUseCount: probe.counts.preToolUse,
      afterFileEditCount: probe.counts.afterFileEdit,
      eventClass,
      probeLogExists: input.probeLogExists === true,
    },
    usage,
    repertoire,
    hooksAtBoot: input.hooksAtBoot === true || input.hooksAtBoot === false ? input.hooksAtBoot : null,
  };
}

function upsertStationKeyedLine(card, key, value) {
  const line = `${key}: ${value}`;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}:.*$`, 'm');
  if (re.test(card)) return card.replace(re, line);
  const marker = 'Continue this card.';
  const idx = card.lastIndexOf(marker);
  if (idx >= 0) return `${card.slice(0, idx)}${line}\n\n${card.slice(idx)}`;
  return `${card.trimEnd()}\n${line}\n`;
}

/** Host numeric window first. Ticket `windowCite` is not a substitute. Do not derive from tokens÷percent. */
export function stationUsageWindowLabel(usage = {}) {
  if (typeof usage.context_window_size === 'number') return String(usage.context_window_size);
  if (typeof usage.windowCite === 'string' && usage.windowCite.trim()) return usage.windowCite.trim();
  return 'MISS';
}

export function upsertStationCompactRow(root, receipt) {
  const dest = path.join(root, '.xray', 'state', 'STATION.md');
  if (!fs.existsSync(dest)) return null;
  try {
    const fired = receipt.compact?.hostFired ? 'Y' : 'N';
    const count = receipt.compact?.preCompactCount ?? 0;
    const usageBit = receipt.usage?.forbidden
      ? 'FORBIDDEN-FILL'
      : receipt.usage?.miss
        ? 'MISS'
        : 'host-field';
    const tokens =
      typeof receipt.usage?.context_tokens === 'number' ? String(receipt.usage.context_tokens) : 'MISS';
    const heat = receipt.repertoire?.fastened ? 'fastened' : 'absent';
    const windowLabel = stationUsageWindowLabel(receipt.usage || {});
    let card = fs.readFileSync(dest, 'utf8');
    card = upsertStationKeyedLine(
      card,
      'Compact',
      `preCompact ${fired} (count=${count}) · usage ${usageBit} · repertoire ${heat}`,
    );
    card = upsertStationKeyedLine(
      card,
      'Usage',
      `source=${receipt.usage?.source || 'none'} model=${receipt.usage?.model || 'MISS'} window=${windowLabel} tokens=${tokens}`,
    );
    fs.writeFileSync(dest, card);
    return dest;
  } catch {
    return null;
  }
}

export function writeCursorUsageReceipt(root, input = {}) {
  try {
    const receipt = buildCursorUsageReceipt(root, input);
    const dest = cursorUsageReceiptPath(root);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(receipt, null, 2));
    upsertStationCompactRow(root, receipt);
    return dest;
  } catch {
    return null;
  }
}

/**
 * Per-session copy of the latest precompact + usage receipts.
 * The next arm overwrites cursor-precompact.json and cursor-usage-receipt.json.
 */
export function writeCursorSessionReceipt(root, sessionId, paths = {}) {
  const dest = cursorSessionReceiptPath(root, sessionId);
  if (!dest) return null;
  if (!paths.precompactPath && !paths.usagePath) return null;
  try {
    const payload = {
      sessionId: typeof sessionId === 'string' ? sessionId : null,
      precompact: null,
      usage: null,
    };
    if (paths.precompactPath && fs.existsSync(paths.precompactPath)) {
      payload.precompact = JSON.parse(fs.readFileSync(paths.precompactPath, 'utf8'));
    }
    if (paths.usagePath && fs.existsSync(paths.usagePath)) {
      payload.usage = JSON.parse(fs.readFileSync(paths.usagePath, 'utf8'));
    }
    if (!payload.precompact && !payload.usage) return null;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(payload, null, 2));
    return dest;
  } catch {
    return null;
  }
}
