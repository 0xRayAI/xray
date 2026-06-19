import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import {
  applyConferConsultResult,
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
});