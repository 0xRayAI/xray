#!/usr/bin/env node
/**
 * Sync helper for station-hook-runtime.cjs — match Repertoire signals for an intent.
 * Prints a JSON string array. Used on every floor's station heat, not only Grok.
 * Loads the worn provider from dest, not xray src TypeScript.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

function providerCandidates() {
  const configured = routing.module_path
    ? routing.module_path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(routing.module_path)
      ? routing.module_path
      : join(root, routing.module_path)
    : null;
  const raw = [
    join(root, '..', 'repertoire', 'dist', 'provider', 'memory-routing-provider.js'),
    join(root, 'node_modules', '@0xray', 'repertoire', 'dist', 'provider', 'memory-routing-provider.js'),
    configured,
    join(root, 'vendor', '@0xray', 'repertoire', 'dist', 'provider', 'memory-routing-provider.js'),
  ].filter(Boolean);
  const withSubject = [];
  const rest = [];
  for (const dest of raw) {
    const overlay = dest.replace(/dist\/provider\/memory-routing-provider\.js$/, 'data/subject-overlay.json');
    if (existsSync(overlay)) withSubject.push(dest);
    else rest.push(dest);
  }
  return [...withSubject, ...rest];
}

async function loadProvider() {
  for (const dest of providerCandidates()) {
    if (!existsSync(dest)) continue;
    try {
      const mod = await import(pathToFileURL(dest).href);
      if (typeof mod.createMemoryRoutingProvider === 'function') {
        return mod.createMemoryRoutingProvider({
          projectRoot: root,
          signalsPath: routing.config && routing.config.signalsPath,
          statePath: routing.config && routing.config.statePath,
          feedbackDir: routing.config && routing.config.feedbackDir,
        });
      }
      if (typeof mod.loadMemoryRoutingProvider === 'function') {
        return mod.loadMemoryRoutingProvider(routing, root);
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

const provider = await loadProvider();
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
  if (safe.length >= 12) break;
}
process.stdout.write(`${JSON.stringify(safe)}\n`);
process.exit(0);
