import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateMemoryRoutingConfig } from '../node_modules/0xray/dist/memory-routing/validate-config.js';
import { projectRoot } from './repertoire-config.mjs';

export function memoryRoutingHealth() {
  const featuresPath = join(projectRoot(), '.xray', 'features.json');
  const raw = JSON.parse(readFileSync(featuresPath, 'utf8')).memory_routing;
  return validateMemoryRoutingConfig(raw);
}
