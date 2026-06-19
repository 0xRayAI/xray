import { describe, it, expect } from 'vitest';
import {
  LEAD_DEV_RULES,
  buildLeadDevPlan,
  shouldFlagFullTestSuite,
  routeSubagent,
  buildSessionBootContext,
} from '../../nucleus/autonomy-kernel.js';

describe('lead-dev plan builder (internal)', () => {
  it('exports seven rules', () => {
    expect(LEAD_DEV_RULES).toHaveLength(7);
  });

  it('routes task types to subagents', () => {
    expect(routeSubagent('research')).toBe('researcher');
    expect(routeSubagent('architecture')).toBe('architect-tools');
  });

  it('flags full test suite commands', () => {
    expect(shouldFlagFullTestSuite('npm test')).toBe(true);
    expect(shouldFlagFullTestSuite('npm test -- src/foo.test.ts')).toBe(false);
  });

  it('buildLeadDevPlan returns phases when mode active', () => {
    const result = buildLeadDevPlan(
      'Refactor orchestrator MCP across core repos with env mesh',
      ['plan', 'implement'],
    );
    expect(result?.active).toBe(true);
    expect(result?.phases.length).toBeGreaterThan(0);
  });

  it('uses max(thin-dispatch, MCP) for phased plan threshold', () => {
    const result = buildLeadDevPlan(
      'short label',
      ['implement'],
      [{ description: 'single task', type: 'implement' }],
      70,
    );
    expect(result?.requiresPhasedPlan).toBe(true);
    expect(result?.complexity).toBeGreaterThanOrEqual(70);
  });

  it('buildLeadDevPlan creates one todo per analyze-complexity task input', () => {
    const result = buildLeadDevPlan('Jelly P1', ['implement'], [
      { description: 'Publish 0xray@3.4.9', type: 'release' },
      { description: 'Jelly strray to 0xray swap', type: 'migration' },
      { description: 'Wire memory_routing', type: 'config' },
    ]);
    const implPhase = result?.phases.find((p) => p.id === 'phase-2');
    const todos = implPhase?.todos ?? result?.phases[0]?.todos ?? [];
    expect(todos.length).toBe(3);
    expect(todos[0]?.task).toContain('3.4.9');
  });

  it('buildSessionBootContext reflects lead dev mode', () => {
    const ctx = buildSessionBootContext() as { lead_dev_mode: boolean };
    expect(ctx.lead_dev_mode).toBe(true);
  });
});