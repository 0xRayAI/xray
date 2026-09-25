/**
 * Complexity Core — ported from xray src/delegation/complexity-core.ts
 * Single source of truth for complexity analysis across wear/recall bench pipeline.
 */

export const DEFAULT_THRESHOLDS = {
  simple: 15,
  moderate: 25,
  complex: 50,
  enterprise: 75,
};

export const OPERATION_WEIGHTS = {
  create: 1.0,
  modify: 1.2,
  refactor: 1.8,
  analyze: 1.5,
  debug: 2.0,
  test: 1.3,
};

export const RISK_MULTIPLIERS = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  critical: 1.6,
};

export function levelToTier(level) {
  const mapping = {
    simple: 'low',
    moderate: 'medium',
    complex: 'high',
    enterprise: 'enterprise',
  };
  return mapping[level];
}

export function tierToLevel(tier) {
  const mapping = {
    low: 'simple',
    medium: 'moderate',
    high: 'complex',
    enterprise: 'enterprise',
  };
  return mapping[tier];
}

export function getLevelFromScore(score, thresholds = DEFAULT_THRESHOLDS) {
  if (score <= thresholds.simple) return 'simple';
  if (score <= thresholds.moderate) return 'moderate';
  if (score <= thresholds.complex) return 'complex';
  return 'enterprise';
}

export function getTierFromScore(score, thresholds = DEFAULT_THRESHOLDS) {
  return levelToTier(getLevelFromScore(score, thresholds));
}

export function getStrategyForLevel(level) {
  const strategies = {
    simple: 'single-agent',
    moderate: 'multi-agent',
    complex: 'orchestrator-led',
    enterprise: 'orchestrator-led',
  };
  return strategies[level];
}

export function getAgentCountForLevel(level) {
  const counts = { simple: 1, moderate: 2, complex: 3, enterprise: 5 };
  return counts[level];
}

export function getConfidenceForTier(tier) {
  const confidence = { low: 0.6, medium: 0.6, high: 0.7, enterprise: 0.9 };
  return confidence[tier];
}

export function getAgentForTier(tier) {
  const agents = {
    low: 'code-reviewer',
    medium: 'architect',
    high: 'architect',
    enterprise: 'architect',
  };
  return agents[tier];
}

export function getSkillForTier(tier) {
  const skills = {
    low: 'code-review',
    medium: 'architecture-patterns',
    high: 'architect-tools',
    enterprise: 'architect-tools',
  };
  return skills[tier];
}

export function calculateBaseScore(metrics) {
  const fileScore = Math.min(metrics.fileCount * 3, 30);
  const volumeScore = Math.min(metrics.changeVolume / 10, 25);
  const dependencyScore = Math.min(metrics.dependencies * 2, 20);
  const durationScore = Math.min(metrics.estimatedDuration / 3, 15);
  const operationWeight = OPERATION_WEIGHTS[metrics.operationType] || 1.0;
  const riskMultiplier = RISK_MULTIPLIERS[metrics.riskLevel] || 1.0;
  const baseScore = (fileScore + volumeScore + dependencyScore + durationScore) * operationWeight * riskMultiplier;
  return Math.min(Math.round(baseScore), 100);
}

export function generateReasoning(metrics, score, level) {
  const reasoning = [];
  if (metrics.fileCount > 10) {
    reasoning.push(`${metrics.fileCount} files involved (high coordination needed)`);
  } else if (metrics.fileCount > 5) {
    reasoning.push(`${metrics.fileCount} files involved (moderate scope)`);
  }
  if (metrics.changeVolume > 200) {
    reasoning.push(`${metrics.changeVolume} lines changed (substantial changes)`);
  } else if (metrics.changeVolume > 100) {
    reasoning.push(`${metrics.changeVolume} lines changed (moderate changes)`);
  }
  if (metrics.operationType === 'refactor') {
    reasoning.push('Refactoring requires careful planning and validation');
  } else if (metrics.operationType === 'debug') {
    reasoning.push('Debugging complexity varies based on issue depth');
  }
  if (metrics.riskLevel === 'critical') {
    reasoning.push('Critical risk level requires extra validation');
  } else if (metrics.riskLevel === 'high') {
    reasoning.push('High risk requires careful review');
  }
  if (metrics.dependencies > 5) {
    reasoning.push(`${metrics.dependencies} dependencies increase coordination needs`);
  }
  if (score > 75) {
    reasoning.push('Enterprise-level complexity requires full orchestration');
  } else if (score > 50) {
    reasoning.push('Complex task benefits from multi-agent coordination');
  } else if (score > 25) {
    reasoning.push('Moderate complexity appropriate for specialized agents');
  } else {
    reasoning.push('Simple task suitable for direct agent assignment');
  }
  if (level === 'enterprise') {
    reasoning.push('Wear bench routes enterprise tasks through orchestrator-led thinDispatch');
  }
  return reasoning;
}

/** Bench-specific: score wear task string for pipeline-suite ranking */
export function scoreWearTaskText(task, ctx = {}) {
  const metrics = {
    fileCount: ctx.fileCount ?? 1,
    changeVolume: String(task ?? '').length,
    operationType: String(task ?? '').toLowerCase().includes('analyze') ? 'analyze' : 'modify',
    dependencies: ctx.dependencyCount ?? 0,
    riskLevel: String(task ?? '').toLowerCase().includes('trap') ? 'high' : 'low',
    estimatedDuration: Math.ceil(String(task ?? '').length / 20),
  };
  const base = calculateBaseScore(metrics);
  const level = getLevelFromScore(base);
  return {
    metrics,
    score: base,
    level,
    strategy: getStrategyForLevel(level),
    agent: getAgentForTier(levelToTier(level)),
    reasoning: generateReasoning(metrics, base, level),
  };
}
