/**
 * Compact quiz snapshot — disk metrics before/after host preCompact.
 * Does not FILL. Does not estimate tokens from file chars. Does not hand-invoke compact.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PATH_C_NEEDLES = [
  'COMPACT-BEN-001',
  'keep-me-ben-001',
  'bc-DEADBEEF',
  'Seed: 42',
];

const WATCHED = [
  '.xray/state/STATION.md',
  '.xray/state/session-boot.json',
  '.xray/state/cursor-precompact.json',
  '.xray/state/cursor-hook-invoke.log',
  '.xray/state/repertoire-working.json',
  '.cursor/hooks.json',
  'examples/cursor-cloud-compact/UNFINISHED.txt',
  'examples/cursor-cloud-compact/STATION.seed.md',
];

function existsFile(file) {
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function existsDir(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readJson(file) {
  const text = readText(file);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sha256(text) {
  if (text == null) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
}

function fileRecord(root, rel) {
  const abs = path.join(root, rel);
  const text = existsFile(abs) ? readText(abs) : null;
  let mtimeMs = null;
  if (text != null) {
    try {
      mtimeMs = fs.statSync(abs).mtimeMs;
    } catch {
      mtimeMs = null;
    }
  }
  return {
    path: rel,
    exists: text != null,
    bytes: text == null ? 0 : Buffer.byteLength(text),
    sha256: sha256(text),
    mtimeMs,
  };
}

function parseProbe(text) {
  if (!text) {
    return { preCompact: 0, preToolUse: 0, afterFileEdit: 0, lastPreCompact: null };
  }
  const lines = text.split('\n');
  let preCompact = 0;
  let preToolUse = 0;
  let afterFileEdit = 0;
  let lastPreCompact = null;
  for (const line of lines) {
    if (line.includes('event=preCompact')) {
      preCompact += 1;
      lastPreCompact = line.trim();
    } else if (line.includes('event=preToolUse')) {
      preToolUse += 1;
    } else if (line.includes('event=afterFileEdit')) {
      afterFileEdit += 1;
    }
  }
  return { preCompact, preToolUse, afterFileEdit, lastPreCompact };
}

function extractStationHeat(md) {
  if (!md) return { intent: null, plan: null, working: null, repertoire: null, ticket: null, seed: null };
  const grab = (label) => {
    const match = md.match(new RegExp(`^${label}:\\s*(.*)$`, 'm'));
    return match ? match[1].trim() : null;
  };
  return {
    intent: grab('Intent'),
    plan: grab('Plan'),
    working: grab('Working'),
    repertoire: grab('Repertoire'),
    ticket: grab('Ticket'),
    seed: grab('Seed'),
  };
}

function needlesFound(texts, needles) {
  const blob = texts.filter(Boolean).join('\n');
  return needles.map((needle) => ({ needle, present: blob.includes(needle) }));
}

function resolveGitDir(root) {
  const marker = path.join(root, '.git');
  if (existsDir(marker)) return marker;
  if (!existsFile(marker)) return null;
  const gitFile = readText(marker);
  const match = gitFile && gitFile.match(/^gitdir:\s*(.+)$/m);
  if (!match) return null;
  const loc = match[1].trim();
  return path.isAbsolute(loc) ? loc : path.join(root, loc);
}

function readGit(root) {
  const gitDir = resolveGitDir(root);
  if (!gitDir) return { branch: null, head: null };
  const headFile = readText(path.join(gitDir, 'HEAD'));
  if (!headFile) return { branch: null, head: null };
  const trimmed = headFile.trim();
  if (trimmed.startsWith('ref:')) {
    const ref = trimmed.slice('ref:'.length).trim();
    const branch = ref.replace(/^refs\/heads\//, '');
    const sha = readText(path.join(gitDir, ref));
    return { branch, head: sha ? sha.trim().slice(0, 9) : null };
  }
  return { branch: 'detached', head: trimmed.slice(0, 9) };
}

function receiptUsage(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { context_tokens: null, context_window_size: null, context_usage_percent: null };
  }
  const num = (value) => (typeof value === 'number' ? value : null);
  return {
    context_tokens: num(receipt.context_tokens),
    context_window_size: num(receipt.context_window_size),
    context_usage_percent: num(receipt.context_usage_percent),
  };
}

function collectCompactSnapshot(root, opts = {}) {
  const takenAt = opts.now ? new Date(opts.now).toISOString() : new Date().toISOString();
  const files = {};
  for (const rel of WATCHED) {
    files[rel] = fileRecord(root, rel);
  }
  const stationText = readText(path.join(root, '.xray/state/STATION.md'));
  const seedText = readText(path.join(root, 'examples/cursor-cloud-compact/STATION.seed.md'));
  const unfinished = readText(path.join(root, 'examples/cursor-cloud-compact/UNFINISHED.txt'));
  const boot = readJson(path.join(root, '.xray/state/session-boot.json'));
  const receipt = readJson(path.join(root, '.xray/state/cursor-precompact.json'));
  const probeText = readText(path.join(root, '.xray/state/cursor-hook-invoke.log'));
  const needles = opts.needles || PATH_C_NEEDLES;
  return {
    kind: 'grok-bot-compact-snapshot',
    takenAt,
    root,
    git: readGit(root),
    harness: {
      hooksJson: existsFile(path.join(root, '.cursor/hooks.json')),
      repertoireNodeModules: existsDir(path.join(root, 'node_modules/@0xray/repertoire')),
    },
    files,
    station: extractStationHeat(stationText),
    boot: boot
      ? {
          source: boot.source || null,
          event_class: boot.event_class || null,
          sessionId: boot.sessionId || null,
          timestamp: boot.timestamp || null,
          hookEvent: boot.hookEvent || null,
        }
      : null,
    receipt: receipt
      ? {
          event_class: receipt.event_class || null,
          trigger: receipt.trigger || null,
          sessionId: receipt.sessionId || null,
          timestamp: receipt.timestamp || null,
          usage: receiptUsage(receipt),
        }
      : null,
    probe: parseProbe(probeText),
    keys: needlesFound([stationText, seedText, unfinished], needles),
    usageCite: 'Disk snapshot only. Never chars÷4. Host tokens live on preCompact stdin if the writer copies them.',
  };
}

function missingNeedles(snapshot) {
  return (snapshot.keys || []).filter((row) => !row.present).map((row) => row.needle);
}

function quizCompactSnapshots(before, after) {
  const missingBefore = missingNeedles(before);
  const missingAfter = missingNeedles(after);
  const probeBefore = before.probe?.preCompact || 0;
  const probeAfter = after.probe?.preCompact || 0;
  const survived = missingAfter.length === 0 && (before.keys || []).length > 0;
  const hostReceipt =
    after.receipt?.event_class === 'cursor-host-precompact' &&
    after.receipt?.trigger === 'auto';
  return {
    kind: 'grok-bot-compact-quiz',
    survived,
    missingBefore,
    missingAfter,
    probePreCompactBefore: probeBefore,
    probePreCompactAfter: probeAfter,
    probePreCompactDelta: probeAfter - probeBefore,
    hostReceipt,
    usageOnAfterReceipt: after.receipt?.usage || {
      context_tokens: null,
      context_window_size: null,
      context_usage_percent: null,
    },
    fillForbidden: true,
    notes: [
      'Do not Read activity.log.orig slices to force compact. HOST-FIRE #3–#5 documented that FILL as FAIL.',
      'survive-compact is the after-wake path. This quiz is the before/after disk organ.',
    ],
  };
}

function parseSnapshotArgs(argv) {
  const out = { cwd: null, out: null, before: null, after: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cwd') out.cwd = argv[++i] || null;
    else if (arg.startsWith('--cwd=')) out.cwd = arg.slice('--cwd='.length);
    else if (arg === '--out') out.out = argv[++i] || null;
    else if (arg.startsWith('--out=')) out.out = arg.slice('--out='.length);
    else if (arg === '--before') out.before = argv[++i] || null;
    else if (arg.startsWith('--before=')) out.before = arg.slice('--before='.length);
    else if (arg === '--after') out.after = argv[++i] || null;
    else if (arg.startsWith('--after=')) out.after = arg.slice('--after='.length);
    else if (arg === '--json') out.json = true;
  }
  return out;
}

function formatQuiz(quiz) {
  const yn = (ok) => (ok ? 'YES' : 'NO');
  const usage = quiz.usageOnAfterReceipt || {};
  const lines = [
    '@0xray/grok-bot compact-quiz — did planted keys survive compact?',
    '',
    `Keys survived: ${yn(quiz.survived)}`,
    `Missing after: ${quiz.missingAfter.join(', ') || 'none'}`,
    `Probe preCompact delta: ${quiz.probePreCompactDelta}`,
    `Host receipt (cursor-host-precompact + trigger=auto): ${yn(quiz.hostReceipt)}`,
    `Receipt context_tokens: ${usage.context_tokens == null ? 'none' : usage.context_tokens}`,
    `Receipt context_window_size: ${usage.context_window_size == null ? 'none' : usage.context_window_size}`,
    '',
    'A friend would hear: snapshot disk, do real work, wait for the host to summarize, snapshot again, quiz the keys. Do not FILL logs to buy compact. Never chars÷4.',
    '',
  ];
  return lines.join('\n');
}

module.exports = {
  PATH_C_NEEDLES,
  WATCHED,
  collectCompactSnapshot,
  quizCompactSnapshots,
  parseSnapshotArgs,
  formatQuiz,
  parseProbe,
  extractStationHeat,
};
