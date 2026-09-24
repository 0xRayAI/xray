#!/usr/bin/env node
/**
 * Station organ write — compact ingest + wake grow.
 * Grow uses the worn RepertoireService. Groover field stays off.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Tail cap for diary files the kernel list does not open. Heat only. */
const UNREAD_DIARY_CAP = 80_000;

/**
 * Suit logs with a writer and no brain reader.
 * Graded sessions and the five kernel-diary files stay on their existing readers.
 * latest-session.json stays a station note, not a corpus session.
 */
const UNREAD_DIARY_FILES = [
  ['logs', 'framework', 'activity-report.json'],
  ['logs', 'framework', 'plugin-tool-events.log'],
  ['.xray', 'inference', 'postprocessor-light-latest.json'],
];

const root = process.argv[2];
const mode = process.argv[3] || 'station';

function readRouting(projectRoot) {
  let routing = { enabled: false, provider: 'null' };
  const featuresPath = join(projectRoot, '.xray', 'features.json');
  if (existsSync(featuresPath)) {
    try {
      routing = JSON.parse(readFileSync(featuresPath, 'utf8')).memory_routing || routing;
    } catch {
      /* leftover */
    }
  }
  return routing;
}

function isExplicitOptOut(routing) {
  return routing && routing.enabled === false && routing.provider === 'repertoire';
}

function organServiceCandidates(projectRoot, routing) {
  const configured = routing.module_path
    ? routing.module_path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(routing.module_path)
      ? routing.module_path
      : join(projectRoot, routing.module_path)
    : null;
  const fromProvider = configured
    ? configured.replace(/provider\/memory-routing-provider\.js$/, 'RepertoireService.js')
    : null;
  const raw = [
    fromProvider,
    join(projectRoot, 'node_modules', '@0xray', 'repertoire', 'dist', 'RepertoireService.js'),
    join(projectRoot, 'vendor', '@0xray', 'repertoire', 'dist', 'RepertoireService.js'),
    join(projectRoot, '..', 'repertoire', 'dist', 'RepertoireService.js'),
  ].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const dest of raw) {
    if (seen.has(dest) || !existsSync(dest)) continue;
    seen.add(dest);
    out.push(dest);
  }
  return out;
}

function ensureDestShape(destSignals) {
  if (!existsSync(destSignals)) return;
  try {
    const data = JSON.parse(readFileSync(destSignals, 'utf8'));
    if (!Array.isArray(data.signals)) return;
    let dirty = false;
    for (const signal of data.signals) {
      if (!signal) continue;
      if (!Array.isArray(signal.tags)) {
        signal.tags = [];
        dirty = true;
      }
      if (typeof signal.definition !== 'string') {
        signal.definition = String(signal.name || '');
        dirty = true;
      }
    }
    if (dirty) writeFileSync(destSignals, `${JSON.stringify(data, null, 2)}\n`);
  } catch {
    /* leftover */
  }
}

function readCleanupDiary(projectRoot) {
  const files = [
    join(projectRoot, '.xray', 'state', 'NOTES.md'),
    join(projectRoot, '.xray', 'state', 'CLEANSE-LIST.md'),
    join(projectRoot, 'docs', 'archive', 'README.md'),
  ];
  const parts = [];
  const sources = [];
  for (const dest of files) {
    if (!existsSync(dest)) continue;
    try {
      parts.push(readFileSync(dest, 'utf8'));
      sources.push(dest);
    } catch {
      /* leftover */
    }
  }
  return { text: parts.join('\n'), sources };
}

function pushMatching(dir, pattern, into) {
  if (!existsSync(dir)) return;
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  const matched = names.filter((name) => pattern.test(name)).sort().reverse();
  for (const name of matched) into.push(join(dir, name));
}

/**
 * Diary, activity, and workflow files the kernel candidate list does not open.
 * Text is heat for last_seen. It is not a lesson and not a graded session.
 */
export function collectUnreadSuitDiary(projectRoot) {
  const files = UNREAD_DIARY_FILES.map((parts) => join(projectRoot, ...parts));
  pushMatching(join(projectRoot, '.xray', 'inference'), /^workflow-\d+\.json$/, files);
  pushMatching(join(projectRoot, 'logs', 'monitoring'), /^memory-monitor-.+\.log$/, files);
  pushMatching(join(projectRoot, '.opencode', 'logs'), /^xray-plugin-.+\.log$/, files);
  const sources = [];
  const chunks = [];
  let used = 0;
  for (const file of files) {
    const resolved = resolve(file);
    if (!existsSync(resolved) || sources.includes(resolved)) continue;
    let raw = '';
    try {
      raw = readFileSync(resolved, 'utf8');
    } catch {
      continue;
    }
    if (!raw.trim()) continue;
    const remain = UNREAD_DIARY_CAP - used;
    if (remain <= 0) break;
    const slice = raw.length > remain ? raw.slice(-remain) : raw;
    chunks.push(slice);
    sources.push(resolved);
    used += slice.length;
  }
  return { text: chunks.join('\n'), sources };
}

async function growDest(projectRoot) {
  const routing = readRouting(projectRoot);
  if (isExplicitOptOut(routing)) {
    process.stdout.write(`${JSON.stringify({ skipped: 'opt-out' })}\n`);
    return;
  }
  for (const dest of organServiceCandidates(projectRoot, routing)) {
    try {
      const mod = await import(pathToFileURL(dest).href);
      const RepertoireService = mod.RepertoireService;
      if (typeof RepertoireService !== 'function') continue;
      const pathsMod = await import(pathToFileURL(dest.replace(/RepertoireService\.js$/, 'paths.js')).href);
      const destSignals = join(projectRoot, '.xray', 'state', 'repertoire', 'curated_signals.json');
      ensureDestShape(destSignals);
      const service = new RepertoireService({
        projectRoot,
        signalsPath: destSignals,
        syncXray: false,
        syncField: false,
      });
      ensureDestShape(destSignals);
      const before = service.signalsManager.load().signals.length;
      const sessions = service.syncXrayMemory();
      const kernel =
        typeof pathsMod.collectKernelDiaryText === 'function'
          ? pathsMod.collectKernelDiaryText(projectRoot)
          : { text: '', sources: [] };
      const cleanup = readCleanupDiary(projectRoot);
      const unread = collectUnreadSuitDiary(projectRoot);
      const diary = service.heatKernelDiary({
        text: [kernel.text, cleanup.text, unread.text].filter(Boolean).join('\n'),
        sources: [...(kernel.sources || []), ...cleanup.sources, ...unread.sources],
      });
      const after = service.signalsManager.load().signals.length;
      const heatedNames = Array.isArray(diary.heated) ? diary.heated : [];
      process.stdout.write(
        `${JSON.stringify({
          before,
          after,
          imported: sessions.imported,
          observed: heatedNames.length,
          heated: heatedNames,
          destCount: after,
        })}\n`,
      );
      return;
    } catch {
      /* try next organ */
    }
  }
  process.stdout.write(`${JSON.stringify({ skipped: 'no-organ' })}\n`);
}

function invokedAsScript() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedAsScript()) {
  if (!root) {
    process.exit(0);
  }

  if (mode === '--grow') {
    await growDest(root);
    process.exit(0);
  }

  const sessionId = mode;
  const hookEvent = process.argv[4] || 'post_compact';
  let signals = [];
  try {
    signals = JSON.parse(process.argv[5] || '[]');
  } catch {
    signals = [];
  }
  if (!Array.isArray(signals) || signals.length === 0) {
    process.exit(0);
  }

  let routing = { enabled: false, provider: 'null' };
  const featuresPath = join(root, '.xray', 'features.json');
  if (existsSync(featuresPath)) {
    try {
      routing = JSON.parse(readFileSync(featuresPath, 'utf8')).memory_routing || routing;
    } catch {
      /* leftover */
    }
  }

  const { loadMemoryRoutingProvider } = await import('../../memory-routing/index.js');
  const provider = await loadMemoryRoutingProvider(routing, root);
  if (!provider || typeof provider.ingestFeedback !== 'function') process.exit(0);

  provider.ingestFeedback({
    timestamp: new Date().toISOString(),
    sessionId,
    taskId: `station-${hookEvent}`,
    assignedAgent: 'station',
    memorySignals: signals,
    complexity: 0,
    success: true,
    durationMs: 0,
  });
  process.exit(0);
}
