#!/usr/bin/env node
/**
 * Compact ingest — persist matched signals back into the organ (project-local copy).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const sessionId = process.argv[3] || 'station';
const hookEvent = process.argv[4] || 'post_compact';
let signals = [];
try {
  signals = JSON.parse(process.argv[5] || '[]');
} catch {
  signals = [];
}
if (!root || !Array.isArray(signals) || signals.length === 0) {
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
