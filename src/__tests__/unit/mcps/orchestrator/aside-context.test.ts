import { describe, it, expect, beforeEach } from 'vitest';
import {
  spawnAside,
  closeAside,
  closeAllAsides,
  addObservations,
  getActiveAsideCount,
  getActiveAsideIds,
  getAsideState,
  resetAsideContext,
  extractGovernanceObservations,
  extractOrchestrationObservations,
  extractComplexityObservations,
} from '../../../../mcps/orchestrator/aside-context.js';
import type { InferenceCycleResult } from '../../../../inference/inference-cycle.js';
import type { OrchestrationResult, ComplexityAnalysis } from '../../../../mcps/orchestrator/types.js';

beforeEach(() => {
  resetAsideContext();
});

describe('spawnAside', () => {
  it('returns a valid AsideResult', async () => {
    const result = await spawnAside({ description: 'test aside' });
    expect(result.asideId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.observations)).toBe(true);
  });

  it('generates unique aside IDs', async () => {
    const a = await spawnAside({ description: 'a' });
    const b = await spawnAside({ description: 'b' });
    expect(a.asideId).not.toBe(b.asideId);
  });

  it('creates nested asideId with parent prefix', async () => {
    const parent = await spawnAside({ description: 'parent' });
    const child = await spawnAside({ description: 'child', parentAsideId: parent.asideId });
    expect(child.asideId).toContain(parent.asideId);
  });

  it('extracts governanceDecision from priorVerdictContext', async () => {
    const result = await spawnAside({
      description: 'governance aside',
      priorVerdictContext: { decision: 'approve' },
    });
    const decisionObs = result.observations.find((o) => o.key === 'governanceDecision');
    expect(decisionObs).toBeDefined();
    expect(decisionObs!.value).toBe('approve');
  });
});

describe('addObservations', () => {
  it('adds observations to an active aside', async () => {
    const aside = await spawnAside({ description: 'obs test' });
    const added = addObservations(aside.asideId, [
      { key: 'testKey', value: 'testValue', source: 'test' },
    ]);
    expect(added).toBe(true);
    const state = getAsideState(aside.asideId);
    expect(state!.observations).toHaveLength(1);
    expect(state!.observations[0].key).toBe('testKey');
  });

  it('returns false for nonexistent asideId', () => {
    const added = addObservations('nonexistent', [
      { key: 'k', value: 'v', source: 's' },
    ]);
    expect(added).toBe(false);
  });
});

describe('closeAside', () => {
  it('removes an aside from the active registry', async () => {
    const aside = await spawnAside({ description: 'to-close' });
    expect(getActiveAsideCount()).toBe(1);
    const closed = closeAside(aside.asideId);
    expect(closed).toBe(true);
    expect(getActiveAsideCount()).toBe(0);
    expect(getAsideState(aside.asideId)).toBeUndefined();
  });

  it('returns false for nonexistent asideId', () => {
    expect(closeAside('nonexistent')).toBe(false);
  });
});

describe('closeAllAsides', () => {
  it('clears all active asides', async () => {
    await spawnAside({ description: 'a' });
    await spawnAside({ description: 'b' });
    await spawnAside({ description: 'c' });
    expect(getActiveAsideCount()).toBe(3);
    const count = closeAllAsides();
    expect(count).toBe(3);
    expect(getActiveAsideCount()).toBe(0);
    expect(getActiveAsideIds()).toEqual([]);
  });
});

describe('getAsideState', () => {
  it('returns aside details for an active aside', async () => {
    const aside = await spawnAside({ description: 'state-check', sessionId: 'sess-1' });
    const state = getAsideState(aside.asideId);
    expect(state).toBeDefined();
    expect(state!.asideId).toBe(aside.asideId);
    expect(state!.description).toBe('state-check');
    expect(state!.sessionId).toBe('sess-1');
    expect(state!.startedAt).toBeGreaterThan(0);
  });

  it('returns undefined for closed aside', async () => {
    const aside = await spawnAside({ description: 'gone' });
    closeAside(aside.asideId);
    expect(getAsideState(aside.asideId)).toBeUndefined();
  });
});

describe('getActiveAsideIds', () => {
  it('returns IDs for all active asides', async () => {
    const a = await spawnAside({ description: 'a' });
    const b = await spawnAside({ description: 'b' });
    const ids = getActiveAsideIds();
    expect(ids).toContain(a.asideId);
    expect(ids).toContain(b.asideId);
    expect(ids).toHaveLength(2);
  });
});

describe('extractGovernanceObservations', () => {
  it('extracts observations from an InferenceCycleResult', () => {
    const result: InferenceCycleResult = {
      cycleId: 'cycle-1',
      triggered: true,
      triggerReason: 'test',
      corpusSummary: { sessions: 3, totalCommits: 10, recurringPatterns: 2, recurringProblems: 1 },
      proposals: [],
      votes: [
        { proposalId: 'p1', decision: 'approve', confidence: 0.9, details: [] },
        { proposalId: 'p2', decision: 'reject', confidence: 0.3, details: [] },
      ],
      phase: 'complete',
      completedAt: new Date().toISOString(),
      duration: 100,
    };
    const obs = extractGovernanceObservations(result);
    expect(obs.length).toBeGreaterThan(0);
    expect(obs.find((o) => o.key === 'governanceCycleId')!.value).toBe('cycle-1');
    expect(obs.find((o) => o.key === 'governanceApprovedCount')!.value).toBe('1');
    expect(obs.find((o) => o.key === 'governanceRejectedCount')!.value).toBe('1');
    expect(obs.find((o) => o.key === 'corpusSessionCount')!.value).toBe('3');
    expect(obs.find((o) => o.key === 'corpusPatternCount')!.value).toBe('2');
  });
});

describe('extractOrchestrationObservations', () => {
  it('extracts observations from an OrchestrationResult', () => {
    const result: OrchestrationResult = {
      sessionId: 'sess-1',
      success: true,
      completedTasks: 5,
      failedTasks: 0,
      duration: 1000,
      agentUtilization: { agent1: 3, agent2: 2 },
      bottlenecks: ['agent1 overloaded'],
      recommendations: ['redistribute tasks'],
    };
    const obs = extractOrchestrationObservations(result);
    expect(obs.find((o) => o.key === 'orchestrationSuccess')!.value).toBe('true');
    expect(obs.find((o) => o.key === 'tasksCompleted')!.value).toBe('5');
    expect(obs.find((o) => o.key === 'tasksFailed')!.value).toBe('0');
    expect(obs.find((o) => o.key === 'bottleneck')!.value).toBe('agent1 overloaded');
    expect(obs.find((o) => o.key === 'recommendation')!.value).toBe('redistribute tasks');
  });
});

describe('extractComplexityObservations', () => {
  it('extracts observations from a ComplexityAnalysis', () => {
    const analysis: ComplexityAnalysis = {
      overallComplexity: 45,
      recommendedStrategy: 'optimized',
      taskComplexity: [
        { complexity: 30, category: 'fix' },
        { complexity: 60, category: 'refactor' },
      ],
      agentAssignments: [
        { agent: 'agent1', taskCount: 2, utilization: 80 },
      ],
      estimatedDuration: 500,
      parallelPotential: 0.5,
    };
    const obs = extractComplexityObservations(analysis);
    expect(obs.find((o) => o.key === 'complexityScore')!.value).toBe('45');
    expect(obs.find((o) => o.key === 'recommendedStrategy')!.value).toBe('optimized');
    expect(obs.find((o) => o.key === 'parallelPotential')!.value).toBe('0.5');
    expect(obs.find((o) => o.key === 'estimatedDuration')!.value).toBe('500ms');
    expect(obs.filter((o) => o.key === 'taskComplexity')).toHaveLength(2);
  });
});

describe('resetAsideContext', () => {
  it('clears state and resets counter', async () => {
    await spawnAside({ description: 'a' });
    await spawnAside({ description: 'b' });
    expect(getActiveAsideCount()).toBe(2);
    resetAsideContext();
    expect(getActiveAsideCount()).toBe(0);
    expect(getActiveAsideIds()).toEqual([]);
    const c = await spawnAside({ description: 'c' });
    expect(c.asideId).toMatch(/^aside-1-/);
  });
});
