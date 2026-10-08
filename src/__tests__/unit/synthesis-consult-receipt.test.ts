import { describe, expect, it } from 'vitest';
import {
  buildReceiptFromConsultOutput,
  hasValidSynthesisConsultReceipt,
  parseConsultVerdictFromText,
  tryRecordSynthesisConsultReceipt,
  writeSynthesisConsultReceipt,
} from '../../nucleus/synthesis-consult-receipt.js';
import {
  savePersistedLeadDevPlan,
  updatePlanTodoStatus,
} from '../../nucleus/lead-dev-plan-persistence.js';
import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import * as fs from 'fs';
import * as path from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('synthesis-consult-receipt', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'xray-receipt-'));
  const sessionId = 'receipt-test-session';

  it('parses an explicit final verdict line and ignores an echoed menu', () => {
    expect(parseConsultVerdictFromText('Verdict: CONDITIONAL PASS')).toBe('CONDITIONAL');
    expect(parseConsultVerdictFromText('Verdict: SHIP')).toBe('PASS');
    expect(parseConsultVerdictFromText('Verdict: FAIL on security')).toBe('FAIL');
    expect(parseConsultVerdictFromText('Verdict: REJECT')).toBe('FAIL');
    expect(parseConsultVerdictFromText('Verdict: REJECTED')).toBe('FAIL');
    expect(parseConsultVerdictFromText('Architect review: CONDITIONAL PASS')).toBeNull();
    expect(parseConsultVerdictFromText('Code review: SHIP')).toBeNull();
    expect(parseConsultVerdictFromText('Verdict FAIL on security')).toBeNull();
    const echoed = '- Verdict: PASS | CONDITIONAL | FAIL';
    expect(parseConsultVerdictFromText(echoed)).toBeNull();
    expect(parseConsultVerdictFromText(`${echoed}\n\nVerdict: FAIL\nHardening: split`)).toBe('FAIL');
    expect(
      parseConsultVerdictFromText('DECISION: abstain\nREASONING: nested LLM not configured.'),
    ).toBe('UNREVIEWED');
    expect(
      parseConsultVerdictFromText(
        'DECISION: abstain\nREASONING: nested LLM configured but returned no vote.',
      ),
    ).toBe('CONDITIONAL');
    expect(parseConsultVerdictFromText('DECISION: approve|reject|abstain')).toBeNull();
  });

  it('blocks consult todo completion without receipt', () => {
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    const plan = buildSynthesisCheckpointPlan('gate threshold', tmp);
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );

    expect(updatePlanTodoStatus('s.1', 'completed', tmp)).toBe(false);
  });

  it('blocks consult todo completion when receipt verdict is FAIL', () => {
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    const plan = buildSynthesisCheckpointPlan('gate threshold', tmp);
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );
    writeSynthesisConsultReceipt(
      's.1',
      {
        sessionId,
        subagent: 'researcher',
        verdict: 'FAIL',
        topRisks: ['critical'],
        hardeningNote: 'do not ship',
      },
      tmp,
    );
    expect(updatePlanTodoStatus('s.1', 'completed', tmp)).toBe(false);
  });

  it('allows consult todo completion with valid receipt', () => {
    writeSynthesisConsultReceipt(
      's.1',
      {
        sessionId,
        subagent: 'researcher',
        verdict: 'PASS',
        topRisks: [],
        hardeningNote: 'Add dry-synthesis fallback',
      },
      tmp,
    );

    expect(
      hasValidSynthesisConsultReceipt('s.1', tmp, {
        sessionId,
        subagent: 'researcher',
      }),
    ).toBe(true);
    expect(updatePlanTodoStatus('s.1', 'completed', tmp)).toBe(true);
  });

  it('records receipt from subagent output text', () => {
    const receipt = tryRecordSynthesisConsultReceipt(
      's.2',
      'architect-tools',
      sessionId,
      'Verdict: CONDITIONAL\n- Top risk: consult receipt gate\nHardening: keep the gate',
      tmp,
    );
    expect(receipt?.verdict).toBe('CONDITIONAL');
    expect(
      hasValidSynthesisConsultReceipt('s.2', tmp, {
        sessionId,
        subagent: 'architect-tools',
      }),
    ).toBe(true);
  });

  it('builds receipt from structured output', () => {
    const built = buildReceiptFromConsultOutput(
      's.3',
      'code-review',
      sessionId,
      'Verdict: PASS\nHardening: align sessionId between seed and Grok hooks.',
    );
    expect(built?.verdict).toBe('PASS');
    expect(built?.subagent).toBe('code-review');
  });

  it('UNREVIEWED completes the todo unless suit_temperament is strict', () => {
    const strictRoot = mkdtempSync(path.join(tmpdir(), 'xray-receipt-strict-'));
    fs.mkdirSync(path.join(strictRoot, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(strictRoot, '.xray', 'features.json'),
      JSON.stringify({
        suit_temperament: { profile: 'strict' },
        multi_agent_orchestration: { lead_dev_mode: true, confer_on_synthesis: true },
      }),
    );
    const plan = buildSynthesisCheckpointPlan('gate threshold', strictRoot);
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      strictRoot,
    );
    writeSynthesisConsultReceipt(
      's.1',
      {
        sessionId,
        subagent: 'researcher',
        verdict: 'UNREVIEWED',
        topRisks: ['no governance LLM'],
        hardeningNote: 'abstain is not a review',
      },
      strictRoot,
    );
    expect(updatePlanTodoStatus('s.1', 'completed', strictRoot)).toBe(false);

    const guidedRoot = mkdtempSync(path.join(tmpdir(), 'xray-receipt-guided-'));
    fs.mkdirSync(path.join(guidedRoot, '.xray', 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(guidedRoot, '.xray', 'features.json'),
      JSON.stringify({
        multi_agent_orchestration: { lead_dev_mode: true, confer_on_synthesis: true },
      }),
    );
    const guidedPlan = buildSynthesisCheckpointPlan('gate threshold', guidedRoot);
    savePersistedLeadDevPlan(
      { ...guidedPlan!, persistedAt: new Date().toISOString(), sessionId },
      guidedRoot,
    );
    writeSynthesisConsultReceipt(
      's.1',
      {
        sessionId,
        subagent: 'researcher',
        verdict: 'UNREVIEWED',
        topRisks: [],
        hardeningNote: 'recorded',
      },
      guidedRoot,
    );
    expect(updatePlanTodoStatus('s.1', 'completed', guidedRoot)).toBe(true);
    rmSync(strictRoot, { recursive: true, force: true });
    rmSync(guidedRoot, { recursive: true, force: true });
  });
});