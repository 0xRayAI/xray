import { describe, it, expect } from 'vitest';
import {
  dependencyCount,
  getExecutionPlanner,
} from '../../mcps/orchestrator/execution/execution-planner.js';
import type { OrchestrationTask } from '../../mcps/orchestrator/types.js';

describe('execution-planner dependencyCount', () => {
  it('treats numeric dependencies as a count hint (analyze-complexity)', () => {
    expect(dependencyCount(8)).toBe(8);
    expect(dependencyCount(0)).toBe(0);
  });

  it('treats string arrays as task-ID dependencies', () => {
    expect(dependencyCount(['a', 'b'])).toBe(2);
  });

  it('returns 0 for missing dependencies', () => {
    expect(dependencyCount(undefined)).toBe(0);
  });
});

describe('ExecutionPlanner.calculateTaskComplexity', () => {
  const planner = getExecutionPlanner();

  it('does not produce NaN when dependencies is a number', () => {
    const task: OrchestrationTask = {
      id: 't1',
      description: 'migrate jelly',
      type: 'migration',
      dependencies: 8,
    };
    const score = planner.calculateTaskComplexity(task);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it('aggregates finite overall complexity across numeric dependency hints', async () => {
    const analysis = await planner.analyzeTaskComplexity([
      {
        id: 't1',
        description: 'task one',
        type: 'implement',
        dependencies: 4,
      },
      {
        id: 't2',
        description: 'task two',
        type: 'implement',
        dependencies: 6,
      },
    ]);
    expect(Number.isFinite(analysis.overallComplexity)).toBe(true);
    expect(analysis.overallComplexity).toBeGreaterThan(0);
  });

  it('routes type implement to backend-engineer (routeSubagent SSOT)', async () => {
    const analysis = await planner.analyzeTaskComplexity([
      {
        id: 'impl-1',
        description: 'swap dependencies',
        type: 'implement',
      },
    ]);
    expect(analysis.agentAssignments[0]?.agent).toBe('backend-engineer');
  });
});