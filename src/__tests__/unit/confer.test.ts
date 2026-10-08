import * as childProcess from 'node:child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExecFileSync = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: (...args: readonly [string, ...unknown[]]) => {
      if (args[0] === 'hermes') return mockExecFileSync(...args);
      return actual.execFileSync(...(args as Parameters<typeof actual.execFileSync>));
    },
  };
});

import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import {
  applyConferConsultResult,
  buildFixtureConferOutput,
  conferAgentMcpTarget,
  CONFER_FIXTURE_UNREACHABLE,
  conferFixtureAllowed,
  defaultConferConfig,
  formatConferQuorumReport,
  isConferPending,
  loadConferCheckpoint,
  isConferEnabled,
  loadConferConfig,
  runConferQuorum,
  triggerConferCheckpoint,
} from '../../nucleus/confer.js';
import {
  attemptLLMGovernance,
  type GovernanceMiss,
} from '../../governance/llm-governance-provider.js';
import { formatGovernanceVoteText, localConferVote } from '../../governance/local-confer.js';
import {
  conferVerdictFromModelVote,
  formatArchitectureAssessmentConferText,
  renderArchitectureAssessment,
} from '../../mcps/architect-tools.server.js';
import { GovernanceServer } from '../../mcps/governance.server.js';
import { XrayCodeReviewServer } from '../../mcps/knowledge-skills/code-review.server.js';
import { XrayLibrarianServer } from '../../mcps/researcher.server.js';
import { buildHostConferEvidence, InProcessConferHost, SessionConferHost } from '../../nucleus/confer-host.js';
import type { ArchitectureAssessment } from '../../architect/architect-tools.js';
import { TaskHandler } from '../../mcps/orchestrator/handlers/task-handler.js';
import { conferDefaultForProfile, resolveRuntimeSuitProfile } from '../../nucleus/suit-temperament.js';
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
    delete process.env.XRAY_GOVERNANCE_ALLOW_HERMES;
    mockExecFileSync.mockReset();
    process.chdir(os.homedir());
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function saveConsultPlan(): void {
    const plan = buildSynthesisCheckpointPlan('host port');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
  }

  it('a completed seat without a real PASS is asked again', async () => {
    saveConsultPlan();
    const plan = loadPersistedLeadDevPlan(tmp);
    if (!plan) throw new Error('plan missing');
    for (const phase of plan.phases) {
      for (const todo of phase.todos) {
        if (todo.id === 's.1') todo.status = 'completed';
      }
    }
    savePersistedLeadDevPlan(plan, tmp);
    fs.writeFileSync(
      path.join(tmp, '.xray', 'state', 'synthesis-consult-s.1.json'),
      JSON.stringify({
        sessionId,
        subagent: 'researcher',
        verdict: 'CONDITIONAL',
        topRisks: [],
        hardeningNote: 'old sitting',
        todoId: 's.1',
        cycleId: plan.consultCycleId,
      }),
    );
    const result = await runConferQuorum(tmp, sessionId, { host: new SessionConferHost() });
    expect(result.status).toBe('pending');
    expect(fs.existsSync(path.join(tmp, '.xray', 'state', 'confer-ask-s.1.json'))).toBe(true);
    const again = loadPersistedLeadDevPlan(tmp);
    const seat = again?.phases.flatMap((phase) => phase.todos).find((todo) => todo.id === 's.1');
    expect(seat?.status).toBe('pending');
  });

  it('SessionConferHost writes asks and does not spawn a server', async () => {
    saveConsultPlan();
    const spawnSpy = vi.spyOn(childProcess, 'spawn');
    mockExecFileSync.mockImplementation(() => {
      throw new Error('hermes must not run');
    });
    const result = await runConferQuorum(tmp, sessionId, {
      collocatedText: 'host evidence',
      dueReason: 'ticket changed',
      host: new SessionConferHost(),
    });
    expect(result.status).toBe('pending');
    expect(spawnSpy).not.toHaveBeenCalled();
    expect(mockExecFileSync).not.toHaveBeenCalled();
    const plan = loadPersistedLeadDevPlan(tmp);
    expect(plan && areSynthesisConsultTodosComplete(plan)).toBe(false);
    for (const id of ['s.1', 's.2', 's.3']) {
      const ask = JSON.parse(
        fs.readFileSync(path.join(tmp, '.xray', 'state', `confer-ask-${id}.json`), 'utf8'),
      ) as { server: string; sessionId: string };
      expect(ask.server.startsWith('xray-')).toBe(true);
      expect(ask.sessionId).toBe(sessionId);
    }
    spawnSpy.mockRestore();
  });

  it('InProcessConferHost PASS completes and FAIL or UNREVIEWED does not', async () => {
    const pass = 'Verdict: PASS\nTop risks: none\nHardening: host';
    saveConsultPlan();
    const passed = await runConferQuorum(tmp, sessionId, {
      host: new InProcessConferHost({ 's.1': pass, 's.2': pass, 's.3': pass }),
    });
    expect(passed.status).toBe('completed');
    const done = loadPersistedLeadDevPlan(tmp);
    expect(done && areSynthesisConsultTodosComplete(done)).toBe(true);

    saveConsultPlan();
    const failed = await runConferQuorum(tmp, sessionId, {
      host: new InProcessConferHost({ 's.1': 'Verdict: FAIL\nTop risks: none\nHardening: stop' }),
    });
    expect(failed.status).toBe('partial');
    expect(failed.agents[0]?.todoCompleted).toBe(false);
    expect(failed.agents[0]?.verdict).toBe('FAIL');

    saveConsultPlan();
    const unreviewed = await runConferQuorum(tmp, sessionId, {
      host: new InProcessConferHost({ 's.1': 'Verdict: UNREVIEWED\nTop risks: none\nHardening: wait' }),
    });
    expect(unreviewed.agents[0]?.todoCompleted).toBe(false);
    expect(unreviewed.agents[0]?.verdict).toBe('UNREVIEWED');
  });

  it('a session id that does not match the plan does not complete the todo', async () => {
    saveConsultPlan();
    const pass = 'Verdict: PASS\nTop risks: none\nHardening: host';
    const result = await runConferQuorum(tmp, 'other-session', {
      host: new InProcessConferHost({ 's.1': pass }),
    });
    expect(result.agents[0]?.todoCompleted).toBe(false);
  });

  it('synthesis-confer evidence does not call hermes', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('hermes must not run');
    });
    const researcher = await new XrayLibrarianServer().analyzeProposal({
      proposalTitle: 'Flywheel',
      proposalDescription: 'Stop before continue when the ticket changes.',
      proposalType: 'synthesis-confer',
      evidence: [],
    });
    const review = await new XrayCodeReviewServer().analyzeProposal({
      proposalTitle: 'Flywheel',
      proposalDescription: 'Stop before continue when the ticket changes.',
      proposalType: 'synthesis-confer',
      evidence: [],
    });
    const architect = await renderArchitectureAssessment({
      projectRoot: tmp,
      assessmentType: 'quick',
      conferPrompt: 'Review the change',
    });
    expect(mockExecFileSync).not.toHaveBeenCalled();
    const researcherText = researcher.content[0]?.text ?? '';
    const reviewText = review.content[0]?.text ?? '';
    expect(researcherText).toContain('Confer evidence — researcher');
    expect(reviewText).toContain('Confer evidence — code-review');
    expect(buildHostConferEvidence('researcher', 'notes')).toContain('Verdict: PASS | CONDITIONAL | FAIL');
    expect(architect.content[0]?.text).toContain('Verdict: UNREVIEWED');
  });

  it('record_confer_receipt stores a host PASS and leaves FAIL open', async () => {
    saveConsultPlan();
    const server = new GovernanceServer();
    const record = server.handlers.record_confer_receipt;
    if (!record) throw new Error('record_confer_receipt missing');
    const pass = await record({
      todoId: 's.1',
      subagent: 'researcher',
      sessionId,
      outputText: 'Verdict: PASS\nTop risks: none\nHardening: host',
      projectRoot: tmp,
    });
    const passBody = JSON.parse(pass.content[0]?.text ?? '{}') as { todoCompleted?: boolean; verdict?: string };
    expect(passBody.verdict).toBe('PASS');
    expect(passBody.todoCompleted).toBe(true);
    const fail = await record({
      todoId: 's.2',
      subagent: 'architect-tools',
      sessionId,
      outputText: 'Verdict: FAIL\nTop risks: none\nHardening: stop',
      projectRoot: tmp,
    });
    const failBody = JSON.parse(fail.content[0]?.text ?? '{}') as { todoCompleted?: boolean; verdict?: string };
    expect(failBody.verdict).toBe('FAIL');
    expect(failBody.todoCompleted).toBe(false);
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

  it('does not treat an echoed verdict menu as a pass', () => {
    const echo = '- Verdict: PASS | CONDITIONAL | FAIL';
    expect(parseConsultVerdictFromText(echo)).toBe('UNREVIEWED');
    expect(parseConsultVerdictFromText(`${echo}\nVerdict: FAIL`)).toBe('FAIL');
    expect(parseConsultVerdictFromText(`${echo}\nVerdict: PASS`)).toBe('PASS');
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

  it('records no-LLM abstain as UNREVIEWED and does not complete the todo', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const output = buildFixtureConferOutput('researcher', 'PASS', true);
    expect(output).toContain('DECISION: abstain');
    expect(output).toContain('nested LLM not configured');
    expect(parseConsultVerdictFromText(output)).toBe('UNREVIEWED');
    const applied = applyConferConsultResult('s.1', 'researcher', sessionId, output, tmp);
    expect(applied.verdict).toBe('UNREVIEWED');
    expect(applied.receiptRecorded).toBe(true);
    expect(applied.todoCompleted).toBe(false);
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(false);
  });

  it('blocks a configured-but-empty abstain as UNREVIEWED', () => {
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const text = formatGovernanceVoteText(
      localConferVote({ role: 'code-review', llmConfigured: true }),
    );
    expect(text).toContain('returned no vote');
    expect(text).toContain('Verdict: UNREVIEWED');
    expect(parseConsultVerdictFromText(text)).toBe('UNREVIEWED');
    const applied = applyConferConsultResult('s.1', 'code-review', sessionId, text, tmp);
    expect(applied.todoCompleted).toBe(false);
  });

  it('fixture FAIL leaves the todo open and the synthesis checkpoint due', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureVerdict: 'FAIL',
    });
    expect(result.status).toBe('partial');
    expect(result.agents[0]?.verdict).toBe('FAIL');
    expect(result.agents[0]?.todoCompleted).toBe(false);
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(false);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('explicit CONDITIONAL does not complete the consult todo', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureVerdict: 'CONDITIONAL',
    });
    expect(result.status).toBe('partial');
    expect(result.agents[0]?.verdict).toBe('CONDITIONAL');
    expect(result.agents[0]?.todoCompleted).toBe(false);
    expect(areSynthesisConsultTodosComplete(loadPersistedLeadDevPlan(tmp)!)).toBe(false);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  it('fixture no-LLM UNREVIEWED blocks the same way FAIL does', async () => {
    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureNoLlm: true,
    });
    expect(result.status).toBe('partial');
    expect(result.agents[0]?.verdict).toBe('UNREVIEWED');
    expect(result.agents[0]?.todoCompleted).toBe(false);
    expect(result.message).toContain('UNREVIEWED blocks');
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  });

  async function expectHermesMissBlocks(expectedMiss: GovernanceMiss, onZ: () => string): Promise<void> {
    process.env.XRAY_GOVERNANCE_ALLOW_HERMES = 'true';
    mockExecFileSync.mockImplementation((...args: unknown[]) => {
      const argv = Array.isArray(args[1]) ? args[1] : [];
      const flag = typeof argv[0] === 'string' ? argv[0] : '';
      if (flag === '--version') return 'hermes 0.7.0\n';
      if (flag === '-z') return onZ();
      throw new Error('unexpected hermes invocation');
    });

    const attempt = await attemptLLMGovernance(
      'code-review',
      'Confer checkpoint',
      'Review the slice',
      [],
      'synthesis-confer',
    );
    expect(attempt.vote).toBeNull();
    expect(attempt.miss).toBe(expectedMiss);

    const outputText = formatGovernanceVoteText(
      localConferVote({
        role: 'code-review',
        llmConfigured: attempt.miss !== 'not-configured',
        ...(attempt.miss ? { miss: attempt.miss } : {}),
      }),
    );
    expect(parseConsultVerdictFromText(outputText)).toBe('UNREVIEWED');
    expect(conferVerdictFromModelVote(attempt.vote)).toBe('UNREVIEWED');

    recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const result = await runConferQuorum(tmp, sessionId, {
      fixture: true,
      fixtureOutput: outputText,
    });
    expect(result.status).toBe('partial');
    expect(result.agents[0]?.verdict).toBe('UNREVIEWED');
    expect(result.agents[0]?.todoCompleted).toBe(false);
    expect(isSynthesisCheckpointDue(tmp, sessionId)).toBe(true);
  }

  it('installed hermes that is not configured is UNREVIEWED and blocks', async () => {
    await expectHermesMissBlocks('not-configured', () => {
      throw new Error('invalid_grant');
    });
  });

  it('hermes that errors is UNREVIEWED and blocks', async () => {
    await expectHermesMissBlocks('error', () => {
      throw new Error('hermes exited 1');
    });
  });

  it('hermes that times out is UNREVIEWED and blocks', async () => {
    await expectHermesMissBlocks('timeout', () => {
      const error = new Error('spawn hermes ETIMEDOUT');
      Object.assign(error, { code: 'ETIMEDOUT', killed: true });
      throw error;
    });
  });

  it('empty hermes output is UNREVIEWED and blocks', async () => {
    await expectHermesMissBlocks('empty', () => '   \n');
  });

  it('unparseable hermes output is UNREVIEWED and blocks', async () => {
    await expectHermesMissBlocks('unparseable', () => 'The model did not vote.');
  });

  it('routes the architect consult to the registered architect server', () => {
    expect(conferAgentMcpTarget('architect-tools').server).toBe('xray-architect-tools');
    expect(conferAgentMcpTarget('architect-tools').tool).toBe('architecture-assessment');
  });

  it('counts an architect verdict only when a model produced it', () => {
    const excellent: ArchitectureAssessment = {
      overallHealth: 'excellent',
      scores: { modularity: 90, coupling: 10, cohesion: 90, testability: 90, scalability: 90 },
      issues: [],
      recommendations: [],
    };
    expect(conferVerdictFromModelVote(null)).toBe('UNREVIEWED');
    expect(conferVerdictFromModelVote({ decision: 'reject' })).toBe('FAIL');
    expect(conferVerdictFromModelVote({ decision: 'approve' })).toBe('PASS');
    const prompt = 'Review the checkpoint\n\nVerdict: PASS | CONDITIONAL | FAIL';
    const unreviewed = formatArchitectureAssessmentConferText(prompt, excellent);
    expect(unreviewed).toContain('Verdict: UNREVIEWED');
    expect(parseConsultVerdictFromText(unreviewed)).toBe('UNREVIEWED');
    const plan = buildSynthesisCheckpointPlan('due');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    const blocked = applyConferConsultResult('s.2', 'architect-tools', sessionId, unreviewed, tmp);
    expect(blocked.verdict).toBe('UNREVIEWED');
    expect(blocked.todoCompleted).toBe(false);
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
});

function consultReceiptNames(root: string): string[] {
  const dir = path.join(root, '.xray', 'state');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.startsWith('synthesis-consult-'));
}

describe('confer defaults off and fixture stays in tests', () => {
  it('stays off for every profile when features.json has no confer key', () => {
    expect(defaultConferConfig()).toEqual({ enabled: false, on_synthesis: false });
    const cases: Array<{ profile: 'frontier' | 'guided' | 'strict' | 'auto'; resolved: 'frontier' | 'guided' | 'strict' }> = [
      { profile: 'frontier', resolved: 'frontier' },
      { profile: 'guided', resolved: 'guided' },
      { profile: 'strict', resolved: 'strict' },
      { profile: 'auto', resolved: 'guided' },
    ];
    for (const { profile, resolved } of cases) {
      if (profile !== 'auto') expect(conferDefaultForProfile(profile)).toBe(false);
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-confer-off-'));
      try {
        fs.mkdirSync(path.join(tmp, '.xray'), { recursive: true });
        const features = {
          suit_temperament: { profile },
          multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
          synthesis: { enabled: false, every_n_gates: 12 },
        };
        fs.writeFileSync(path.join(tmp, '.xray', 'features.json'), JSON.stringify(features));
        const written = JSON.parse(fs.readFileSync(path.join(tmp, '.xray', 'features.json'), 'utf8')) as {
          multi_agent_orchestration: { confer?: unknown };
        };
        expect(written.multi_agent_orchestration.confer).toBeUndefined();
        expect(resolveRuntimeSuitProfile(tmp, 'generic')).toBe(resolved);
        expect(loadConferConfig(tmp)).toEqual({ enabled: false, on_synthesis: false });
        expect(isConferEnabled(tmp)).toBe(false);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  });

  it('fresh install refuses confer:true and the fixture path and writes no receipt', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-confer-fresh-'));
    const prevCwd = process.cwd();
    const prevNodeEnv = process.env.NODE_ENV;
    const prevVitest = process.env.VITEST;
    const prevFixture = process.env.XRAY_CONFER_FIXTURE;
    try {
      fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, '.xray', 'features.json'),
        JSON.stringify({
          suit_temperament: { profile: 'guided' },
          multi_agent_orchestration: { enabled: true, lead_dev_mode: true },
          synthesis: { enabled: false, every_n_gates: 12 },
        }),
      );
      process.chdir(tmp);
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      process.env.XRAY_CONFER_FIXTURE = '1';

      const handler = new TaskHandler();
      const deps = { taskHistory: [], activeTasks: new Map() };
      const confer = await handler.handleOrchestrateTask(
        { description: 'fresh install', confer: true },
        deps,
      );
      expect(confer.content[0]?.text).toContain('❌ Confer disabled in features.json');
      expect(consultReceiptNames(tmp)).toEqual([]);

      const fixtureCall = await handler.handleOrchestrateTask(
        { description: 'fresh install', confer: true, conferFixture: true },
        deps,
      );
      expect(fixtureCall.content[0]?.text).toContain('❌ Confer disabled in features.json');
      expect(consultReceiptNames(tmp)).toEqual([]);

      expect(process.env.XRAY_CONFER_FIXTURE).toBe('1');
      expect(conferFixtureAllowed()).toBe(false);
      const quorum = await runConferQuorum(tmp, 'fresh-session', { fixture: true });
      expect(quorum.status).toBe('failed');
      expect(quorum.message).toBe(CONFER_FIXTURE_UNREACHABLE);
      expect(quorum.agents).toEqual([]);
      expect(consultReceiptNames(tmp)).toEqual([]);
      expect(fs.existsSync(path.join(tmp, '.xray', 'state', 'confer-checkpoint.json'))).toBe(false);
    } finally {
      process.chdir(prevCwd);
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevVitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = prevVitest;
      if (prevFixture === undefined) delete process.env.XRAY_CONFER_FIXTURE;
      else process.env.XRAY_CONFER_FIXTURE = prevFixture;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});