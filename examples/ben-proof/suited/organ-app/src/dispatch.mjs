import { AGENTS } from './constants.mjs';
import { confidenceForTask } from './gate.mjs';

const TIER = [
  { max: 15, agent: 'code-reviewer' },
  { max: 25, agent: 'researcher' },
  { max: 50, agent: 'architect' },
  { max: 100, agent: 'orchestrator' },
];

export function tierAgent(score) {
  for (const row of TIER) {
    if (score <= row.max) return row.agent;
  }
  return 'orchestrator';
}

export function resolveThinDispatch(operation, complexityScore, laws) {
  const baseAgent = tierAgent(complexityScore);
  const context = confidenceForTask(operation, laws);
  const agent = context.recommendedAgent && AGENTS.includes(context.recommendedAgent)
    ? context.recommendedAgent
    : baseAgent;
  return {
    agent,
    adjustedScore: complexityScore + context.complexityBoost,
    context,
  };
}
