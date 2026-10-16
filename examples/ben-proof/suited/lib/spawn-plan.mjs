import {
  hasValidLeadDevPlanForSpawn,
  loadPersistedLeadDevPlan,
} from '../node_modules/0xray/dist/nucleus/lead-dev-plan-persistence.js';
import { resolveSpawnPlan } from '../node_modules/0xray/dist/nucleus/spawn-plan-resolution.js';
import { projectRoot } from './repertoire-config.mjs';

export function spawnPlanSnapshot(sessionId) {
  const root = projectRoot();
  const plan = loadPersistedLeadDevPlan(root);
  const resolved = resolveSpawnPlan({}, root, sessionId);
  return {
    hasPlan: Boolean(plan),
    validForSpawn: hasValidLeadDevPlanForSpawn(root, sessionId),
    resolved: {
      source: resolved.source,
      asideId: resolved.asideId ?? null,
      active: Boolean(resolved.plan?.active),
    },
  };
}
