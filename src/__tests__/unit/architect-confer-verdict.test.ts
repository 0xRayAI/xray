import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { architectureAssessment } from '../../architect/architect-tools.js';
import { renderArchitectureAssessment } from '../../mcps/architect-tools.server.js';
import { buildSynthesisCheckpointPlan } from '../../nucleus/autonomy-kernel.js';
import { applyConferConsultResult } from '../../nucleus/confer.js';
import { savePersistedLeadDevPlan, updatePlanTodoStatus } from '../../nucleus/lead-dev-plan-persistence.js';
import { parseConsultVerdictFromText } from '../../nucleus/synthesis-consult-receipt.js';

describe('architect confer verdict follows coupling', () => {
  it('fails a critical coupling finding and does not complete the consult todo', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'arch-confer-'));
    try {
      for (let i = 0; i < 17; i += 1) {
        writeFileSync(path.join(root, `m${i}.ts`), `export const n${i} = ${i};\n`);
      }

      const health = await architectureAssessment(root, 'quick');
      expect(health.scores.coupling).toBe(85);
      expect(
        health.issues.some(
          (issue) => issue.type === 'critical' && issue.description.includes('High coupling'),
        ),
      ).toBe(true);

      const out = await renderArchitectureAssessment({
        projectRoot: root,
        assessmentType: 'quick',
        conferPrompt: 'Review the change\n- Verdict: PASS | CONDITIONAL | FAIL',
      });
      const text = out.content[0]?.text ?? '';
      expect(text).toContain('Verdict: FAIL');
      expect(parseConsultVerdictFromText(text)).toBe('FAIL');

      const sessionId = 'confer-critical-session';
      mkdirSync(path.join(root, '.xray', 'state'), { recursive: true });
      const plan = buildSynthesisCheckpointPlan('critical coupling', root);
      expect(plan).not.toBeNull();
      if (!plan) return;
      savePersistedLeadDevPlan(
        { ...plan, persistedAt: new Date().toISOString(), sessionId },
        root,
      );

      const applied = applyConferConsultResult('s.2', 'architect-tools', sessionId, text, root);
      expect(applied.verdict).toBe('FAIL');
      expect(applied.receiptRecorded).toBe(true);
      expect(applied.todoCompleted).toBe(false);
      expect(updatePlanTodoStatus('s.2', 'completed', root, sessionId)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
