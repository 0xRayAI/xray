import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  LEAD_DEV_RULES,
  MANDATORY_MAJOR_CONSULTS,
  buildLeadDevPlan,
  buildSynthesisCheckpointPlan,
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

  it('buildSynthesisCheckpointPlan injects mandatory consult todos', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-kernel-'));
    const prev = process.cwd();
    try {
      fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          multi_agent_orchestration: {
            lead_dev_mode: true,
            auto_consult_major_work: true,
            confer_on_synthesis: true,
          },
        }),
      );
      process.chdir(tmp);
      const plan = buildSynthesisCheckpointPlan('gate threshold (12/12)');
      expect(plan?.phases[0]?.id).toBe('phase-synthesis');
      expect(plan?.mandatoryConsults).toEqual([...MANDATORY_MAJOR_CONSULTS]);
      expect(plan?.phases[0]?.todos.map((t) => t.subagent)).toEqual([
        ...MANDATORY_MAJOR_CONSULTS,
      ]);
    } finally {
      process.chdir(prev);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('buildLeadDevPlan consults from projectRoot profile, not cwd boot', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-kernel-profile-'));
    try {
      fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          suit_temperament: { profile: 'auto' },
          multi_agent_orchestration: {
            enabled: true,
            lead_dev_mode: true,
            auto_consult_major_work: true,
          },
        }),
      );
      const isolated = buildLeadDevPlan(
        'Aside worktree isolation',
        ['implement'],
        [{ description: 'aside impl', type: 'implement' }],
        30,
        tmp,
      );
      expect(isolated?.phases[0]?.todos.length).toBe(MANDATORY_MAJOR_CONSULTS.length);

      fs.writeFileSync(
        path.join(tmp, '.xray', 'state', 'session-boot.json'),
        JSON.stringify({ host: 'grok', suit_profile: 'frontier' }),
      );
      const frontier = buildLeadDevPlan(
        'Aside worktree isolation',
        ['implement'],
        [{ description: 'aside impl', type: 'implement' }],
        30,
        tmp,
      );
      expect(frontier?.phases[0]?.todos.length).toBe(0);
      expect(frontier?.phases[1]?.todos.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('buildSessionBootContext reflects lead dev mode', () => {
    const ctx = buildSessionBootContext() as { lead_dev_mode: boolean };
    expect(ctx.lead_dev_mode).toBe(true);
  });
});