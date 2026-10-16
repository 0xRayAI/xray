import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

export function projectRoot() {
  return ROOT;
}

export function loadMemoryRoutingConfig() {
  const featuresPath = join(ROOT, '.xray', 'features.json');
  const features = JSON.parse(readFileSync(featuresPath, 'utf8'));
  const mr = features.memory_routing;
  if (!mr?.enabled || mr.provider !== 'repertoire') {
    throw new Error('memory_routing.repertoire not enabled in .xray/features.json');
  }
  return {
    projectRoot: ROOT,
    ...mr.config,
  };
}
