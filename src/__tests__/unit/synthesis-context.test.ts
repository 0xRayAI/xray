import { describe, expect, it } from 'vitest';
import {
  appendSynthesisContextToResponse,
  isAnalyzeComplexitySuccess,
} from '../../nucleus/synthesis-context.js';

describe('synthesis-context helpers', () => {
  it('isAnalyzeComplexitySuccess rejects error responses', () => {
    expect(isAnalyzeComplexitySuccess([{ type: 'text', text: '🔍 Complexity Analysis Results' }])).toBe(
      true,
    );
    expect(
      isAnalyzeComplexitySuccess([{ type: 'text', text: '❌ Complexity analysis failed: boom' }]),
    ).toBe(false);
  });

  it('appendSynthesisContextToResponse appends collocated section', () => {
    const out = appendSynthesisContextToResponse(
      [{ type: 'text', text: 'header' }],
      '# Synthesis checkpoint\nDue: gate threshold',
    );
    expect(out[0]?.text).toContain('header');
    expect(out[0]?.text).toContain('collocated context');
    expect(out[0]?.text).toContain('gate threshold');
  });
});