import {
  evaluatePreToolGate,
  loadDelegationGateFeatures,
} from '../node_modules/0xray/dist/nucleus/delegation-gate.js';
import { projectRoot } from './repertoire-config.mjs';

/** Read-only PreToolUse gate snapshot (constitution + spawn plan ceremony). */
export function delegationGateSnapshot(sessionId, host = 'cursor') {
  const root = projectRoot();
  const features = loadDelegationGateFeatures(root, host);
  const ctx = {
    projectRoot: root,
    sessionId,
    host,
    features,
    hookEvent: 'pre_tool_use',
  };
  const summarize = (decision) => ({
    allow: decision.allow,
    gate: decision.gate ?? null,
    reason: decision.reason ?? null,
  });
  return {
    ceremony: features.ceremony,
    spawnPlanMode: features.spawn_plan_mode,
    readTool: summarize(evaluatePreToolGate('Read', {}, ctx)),
    spawnSubagent: summarize(
      evaluatePreToolGate(
        'spawn_subagent',
        { subagent_type: 'researcher', description: 'bench probe' },
        ctx,
      ),
    ),
  };
}
