import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  conferVerdictFromArchitectureAssessment,
  formatConferArchitectureAssessment,
  type ArchitectureAssessment,
} from '../../architect/architect-tools.js';
import { formatGovernanceVoteText, localConferVote } from '../../governance/local-confer.js';
import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import {
  applyConferConsultResult,
  buildConferPrompt,
  conferUnreviewedBootHint,
  formatConferQuorumReport,
  isConferPending,
  loadConferCheckpoint,
  runConferQuorum,
  triggerConferCheckpoint,
} from '../../nucleus/confer.js';
import {
  areSynthesisConsultTodosComplete,
  loadPersistedLeadDevPlan,
  savePersistedLeadDevPlan,
} from '../../nucleus/lead-dev-plan-persistence.js';
import { parseConsultVerdictFromText } from '../../nucleus/synthesis-consult-receipt.js';
import { recordExecutionSlice, isSynthesisCheckpointDue } from '../../nucleus/synthesis.js';

describe('confer quorum SSOT', () => {
  let tmp: string;
  const sessionId = 'confer-test-session';

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-confer-'));
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: {
          lead_dev_mode: true,
          auto_consult_major_work: true,
          confer_on_synthesis: true,
        },
        synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
      }),
    );
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('runConferQuorum completes all consult todos in fixture mode', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);

    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );

    const result = await runConferQuorum(tmp, sessionId, {
      collocatedText: 'fixture synthesis context',
      dueReason: 'gate threshold',
      fixture: true,
    });

    expect(result.status).toBe('completed');
    expect(result.agents).toHaveLength(3);
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(true);

    const checkpoint = loadConferCheckpoint(tmp);
    expect(checkpoint?.status).toBe('completed');
    expect(checkpoint?.completedAgents).toHaveLength(3);
  });

  it('isConferPending when synthesis consult todos remain', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    triggerConferCheckpoint(sessionId, 'due', tmp);
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    expect(isConferPending(tmp, sessionId)).toBe(true);
  });

  it('maps DECISION reject to FAIL verdict', () => {
    expect(parseConsultVerdictFromText('DECISION: reject\nreason: bad')).toBe('FAIL');
    expect(parseConsultVerdictFromText('DECISION: approve\n')).toBe('PASS');
    expect(parseConsultVerdictFromText('DECISION: abstain\n')).toBe('CONDITIONAL');
  });

  it('FAIL verdict records receipt but does not complete todo', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const applied = applyConferConsultResult(
      's.1',
      'researcher',
      sessionId,
      'DECISION: reject\nTop risks: critical flaw\nHardening: fix first',
      tmp,
    );
    expect(applied.verdict).toBe('FAIL');
    expect(applied.receiptRecorded).toBe(true);
    expect(applied.todoCompleted).toBe(false);
  });

  it('applyConferConsultResult records receipt and completes todo', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const applied = applyConferConsultResult(
      's.1',
      'researcher',
      sessionId,
      'Verdict: PASS\nTop risks: none\nHardening: ship',
      tmp,
    );
    expect(applied.receiptRecorded).toBe(true);
    expect(applied.todoCompleted).toBe(true);
    expect(formatConferQuorumReport({ status: 'completed', agents: [applied], message: 'ok' })).toContain('s.1');
  });

  it('formatConferQuorumReport includes agent emoji panel', () => {
    const report = formatConferQuorumReport({
      status: 'completed',
      message: 'quorum ok',
      agents: [
        {
          todoId: 's.1',
          subagent: 'researcher',
          verdict: 'PASS',
          receiptRecorded: true,
          todoCompleted: true,
        },
        {
          todoId: 's.2',
          subagent: 'architect-tools',
          verdict: 'PASS',
          receiptRecorded: true,
          todoCompleted: true,
        },
      ],
    });
    expect(report).toContain('🔍');
    expect(report).toContain('🏗️');
  });

  it('echoed verdict menu is not a pass, and a final FAIL line blocks the todo', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const prompt = buildConferPrompt('researcher', 'review checkpoint', 'collocated', 'due');
    expect(parseConsultVerdictFromText(prompt)).toBeNull();
    const echoed = applyConferConsultResult('s.1', 'researcher', sessionId, prompt, tmp);
    expect(echoed.verdict).toBeNull();
    expect(echoed.receiptRecorded).toBe(false);
    expect(echoed.todoCompleted).toBe(false);

    const failText = `${prompt}\n\nVerdict: FAIL\n- Top risk: coupling\nHardening: split the module`;
    expect(parseConsultVerdictFromText(failText)).toBe('FAIL');
    const failed = applyConferConsultResult('s.1', 'researcher', sessionId, failText, tmp);
    expect(failed.verdict).toBe('FAIL');
    expect(failed.receiptRecorded).toBe(true);
    expect(failed.todoCompleted).toBe(false);
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(false);
  });

  it('fixture FAIL keeps the todo open and does not clear the checkpoint', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      collocatedText: 'fixture fail',
      dueReason: 'gate threshold',
      fixture: true,
      fixtureVerdict: 'FAIL',
    });
    expect(result.status).toBe('partial');
    expect(result.agents[0]?.verdict).toBe('FAIL');
    expect(result.agents[0]?.todoCompleted).toBe(false);
    expect(result.message).toContain('Confer FAIL blocked');
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(false);
    expect(loadConferCheckpoint(tmp)?.status).toBe('failed');
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('fixture CONDITIONAL and default UNREVIEWED still complete the quorum', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const conditional = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureVerdict: 'CONDITIONAL',
    });
    expect(conditional.status).toBe('completed');
    expect(conditional.agents.every((agent) => agent.verdict === 'CONDITIONAL' && agent.todoCompleted)).toBe(true);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(false);
  });

  it('fixture UNREVIEWED completes the quorum when temperament is not strict', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureVerdict: 'UNREVIEWED',
    });
    expect(result.status).toBe('completed');
    expect(result.agents.every((agent) => agent.verdict === 'UNREVIEWED' && agent.todoCompleted)).toBe(true);
    expect(loadConferCheckpoint(tmp)?.status).toBe('completed');
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(false);
    expect(conferUnreviewedBootHint(tmp)?.conferUnreviewed).toBe(true);
  });

  it('UNREVIEWED completes by default and blocks only when strict', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const voteText = formatGovernanceVoteText(localConferVote({ role: 'researcher' }));
    const guided = applyConferConsultResult('s.1', 'researcher', sessionId, voteText, tmp);
    expect(guided.verdict).toBe('UNREVIEWED');
    expect(guided.receiptRecorded).toBe(true);
    expect(guided.todoCompleted).toBe(true);
    const guidedHint = conferUnreviewedBootHint(tmp);
    expect(guidedHint?.conferUnreviewed).toBe(true);
    expect(guidedHint?.conferUnreviewedHint).toContain('still completes');

    fs.writeFileSync(
      path.join(tmp, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'strict' },
        multi_agent_orchestration: {
          lead_dev_mode: true,
          auto_consult_major_work: true,
          confer_on_synthesis: true,
        },
        synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
      }),
    );
    const blocked = applyConferConsultResult('s.2', 'architect-tools', sessionId, voteText, tmp);
    expect(blocked.verdict).toBe('UNREVIEWED');
    expect(blocked.receiptRecorded).toBe(true);
    expect(blocked.todoCompleted).toBe(false);
    expect(conferUnreviewedBootHint(tmp)?.conferUnreviewedHint).toContain('keeps the todo open');

    const quorum = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureVerdict: 'UNREVIEWED',
    });
    expect(quorum.status).toBe('partial');
    expect(quorum.agents[0]?.todoId).toBe('s.2');
    expect(quorum.agents[0]?.verdict).toBe('UNREVIEWED');
    expect(quorum.agents[0]?.todoCompleted).toBe(false);
    expect(loadConferCheckpoint(tmp)?.status).toBe('failed');
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('derives architect PASS, CONDITIONAL, and FAIL from the assessment', () => {
    const base = {
      scores: { modularity: 90, coupling: 10, cohesion: 90, testability: 90, scalability: 90 },
      recommendations: ['Keep module boundaries'],
    };
    const pass = { ...base, overallHealth: 'excellent' as const, issues: [] };
    const fair = { ...base, overallHealth: 'fair' as const, issues: [] };
    const poor = { ...base, overallHealth: 'poor' as const, issues: [] };
    const criticalIssue: ArchitectureAssessment = {
      ...base,
      overallHealth: 'good',
      issues: [
        {
          type: 'critical',
          description: 'High coupling between components',
          impact: 'Changes ripple',
          recommendation: 'Invert dependencies',
        },
      ],
    };
    expect(conferVerdictFromArchitectureAssessment(pass)).toBe('PASS');
    expect(conferVerdictFromArchitectureAssessment(fair)).toBe('CONDITIONAL');
    expect(conferVerdictFromArchitectureAssessment(poor)).toBe('FAIL');
    expect(conferVerdictFromArchitectureAssessment(criticalIssue)).toBe('FAIL');

    const prompt = buildConferPrompt('architect-tools', 'review', 'context', 'due');
    const text = formatConferArchitectureAssessment(prompt, criticalIssue);
    expect(text).toContain('Verdict: FAIL');
    expect(parseConsultVerdictFromText(text)).toBe('FAIL');
    expect(parseConsultVerdictFromText(formatConferArchitectureAssessment(prompt, pass))).toBe('PASS');
    expect(parseConsultVerdictFromText(formatConferArchitectureAssessment(prompt, fair))).toBe('CONDITIONAL');
  });
});