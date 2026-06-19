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

  it('parses verdict tokens from consult output', () => {
    expect(parseConsultVerdictFromText('Architect review: CONDITIONAL PASS')).toBe('CONDITIONAL');
    expect(parseConsultVerdictFromText('Code review: SHIP')).toBe('PASS');
    expect(parseConsultVerdictFromText('Verdict FAIL on security')).toBe('FAIL');
  });

  it('blocks consult todo completion without receipt', () => {
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
    savePersistedLeadDevPlan(
      { ...plan!, persistedAt: new Date().toISOString(), sessionId },
      tmp,
    );

    expect(updatePlanTodoStatus('s.1', 'completed', tmp)).toBe(false);
  });

  it('blocks consult todo completion when receipt verdict is FAIL', () => {
    fs.mkdirSync(path.join(tmp, '.xray', 'state'), { recursive: true });
    const plan = buildSynthesisCheckpointPlan('gate threshold');
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
      'Architecture consult complete. CONDITIONAL PASS — consult receipt gate recommended.',
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
      'Review complete. PASS — align sessionId between seed and Grok hooks.',
    );
    expect(built?.verdict).toBe('PASS');
    expect(built?.subagent).toBe('code-review');
  });
});