import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from './repertoire-config.mjs';

export function synthesisConfigSnapshot() {
  const featuresPath = join(projectRoot(), '.xray', 'features.json');
  const features = JSON.parse(readFileSync(featuresPath, 'utf8'));
  const synth = features.multi_agent_orchestration?.synthesis_checkpoint ?? {};
  return {
    enabled: synth.enabled === true,
    intervalMinutes: synth.interval_minutes ?? null,
  };
}
