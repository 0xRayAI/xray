#!/usr/bin/env node
/**
 * Sync helper for station-hook-runtime.cjs — match Repertoire signals for an intent.
 * Prints a JSON string array. Used on every floor's station heat, not only Grok.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
const intent = process.argv[3] || '';
if (!root || !intent) {
  process.stdout.write('[]\n');
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
if (!provider || provider.id === 'null' || typeof provider.getTaskConfidence !== 'function') {
  process.stdout.write('[]\n');
  process.exit(0);
}

const conf = provider.getTaskConfidence({
  id: 'station',
  description: String(intent),
  type: 'station',
});
const names = Array.isArray(conf.matchedSignals) ? conf.matchedSignals : [];
const safe = [];
for (const signalName of names) {
  const name = String(signalName || '').trim();
  if (!name || name.toLowerCase().startsWith('bedrock-')) continue;
  safe.push(name);
  if (safe.length >= 4) break;
}
process.stdout.write(`${JSON.stringify(safe)}\n`);
process.exit(0);
