import { describe, expect, it } from 'vitest';
import { repertoireDecisionFields } from '../../integrations/grok/hooks/pre-tool-use.js';

describe('repertoireDecisionFields', () => {
  it('names the agent when the organ changes the route', () => {
    const fields = repertoireDecisionFields({
      agent: 'architect',
      memoryRouting: {
        overridden: true,
        signals: ['attestation-as-map', 'second', 'third', 'fourth', 'fifth'],
      },
    });
    expect(fields?.agent).toBe('architect');
    expect(fields?.gate).toBe('repertoire');
    expect(fields?.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(fields?.hookSpecificOutput.additionalContext).toBe(
      'Repertoire changed the route to architect on attestation-as-map, second, third, fourth. Follow that agent for this work.',
    );
  });

  it('stays quiet when the organ does not change the agent', () => {
    expect(repertoireDecisionFields({
      agent: 'backend-engineer',
      memoryRouting: { overridden: false, signals: ['attestation-as-map'] },
    })).toBeNull();
    expect(repertoireDecisionFields({ agent: 'architect', memoryRouting: {} })).toBeNull();
    expect(repertoireDecisionFields(null)).toBeNull();
  });
});
