/**
 * One pre-tool speak for every host.
 * The lens denies an unnamed plane. The route speaks only when Repertoire changes the agent.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lensBeforeResearch } from './goggles-pipeline.mjs';

const here = dirname(fileURLToPath(import.meta.url));
let scoreAndRouteFn;

function loadScoreAndRoute() {
  if (scoreAndRouteFn !== undefined) return scoreAndRouteFn;
  scoreAndRouteFn = null;
  const require = createRequire(import.meta.url);
  const candidates = [
    join(here, '../../nucleus/thin-dispatch.js'),
    join(here, '../../../dist/nucleus/thin-dispatch.js'),
    join(here, '../../../nucleus/thin-dispatch.js'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const loaded = require(candidate);
      if (typeof loaded.scoreAndRoute === 'function') {
        scoreAndRouteFn = loaded.scoreAndRoute;
        return scoreAndRouteFn;
      }
    } catch {
      /* next built copy */
    }
  }
  return null;
}

/** Speak only when the organ changes the agent. A match that leaves the agent is quiet. */
export function repertoireDecisionFields(routed) {
  if (!routed?.memoryRouting?.overridden || !routed.agent) return null;
  const signals = Array.isArray(routed.memoryRouting.signals)
    ? routed.memoryRouting.signals.slice(0, 4).filter(Boolean)
    : [];
  const why = signals.length ? ` on ${signals.join(', ')}` : '';
  return {
    agent: routed.agent,
    gate: 'repertoire',
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `Repertoire changed the route to ${routed.agent}${why}. Follow that agent for this work.`,
    },
  };
}

export function repertoireRoute(operation) {
  const text = String(operation || '').slice(0, 500).trim();
  if (!text) return null;
  try {
    const scoreAndRoute = loadScoreAndRoute();
    if (!scoreAndRoute) return null;
    return repertoireDecisionFields(scoreAndRoute(text, {}));
  } catch {
    return null;
  }
}

/** The card for this tool, or null when the tool just runs. */
export function lensDecision(root, toolName, spoken) {
  try {
    return lensBeforeResearch(root, toolName, spoken);
  } catch {
    return null;
  }
}
