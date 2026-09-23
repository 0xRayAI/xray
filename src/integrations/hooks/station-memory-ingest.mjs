#!/usr/bin/env node
/**
 * Station organ write — compact ingest + wake grow.
 * Grow uses the worn RepertoireService. Groover field stays off.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
      const diary = service.heatKernelDiary({
        text: [kernel.text, cleanup.text].filter(Boolean).join('\n'),
        sources: [...(kernel.sources || []), ...cleanup.sources],
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
