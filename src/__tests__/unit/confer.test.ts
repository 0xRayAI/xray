import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import {
  applyConferConsultResult,
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