import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  lensDecision,
  repertoireDecisionFields,
  repertoireRoute,
} from '../../integrations/hooks/pre-tool-speak.mjs';

describe('pre-tool speak hosts', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lensDecision stays quiet for an empty spoken string', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-speak-'));
    roots.push(root);
    expect(() => lensDecision(root, 'edit', '')).not.toThrow();
    expect(lensDecision(root, 'edit', '')).toBeNull();
    expect(lensDecision(join(root, 'missing'), 'edit', '')).toBeNull();
  });

  it('repertoireDecisionFields speaks only on an override', () => {
    expect(repertoireDecisionFields(null)).toBeNull();
    expect(repertoireDecisionFields({
      agent: 'architect',
      memoryRouting: { overridden: false, signals: ['attestation-as-map'] },
    })).toBeNull();
    const fields = repertoireDecisionFields({
      agent: 'architect',
      memoryRouting: { overridden: true, signals: ['attestation-as-map'] },
    });
    expect(fields?.agent).toBe('architect');
    expect(fields?.gate).toBe('repertoire');
    expect(fields?.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(fields?.hookSpecificOutput.additionalContext).toContain('architect');
    expect(repertoireRoute('')).toBeNull();
  });
});
