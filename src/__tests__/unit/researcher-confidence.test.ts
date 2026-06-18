import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMemoryRoutingProvider } from '../../memory-routing/provider-registry.js';
import type { MemoryRoutingProvider } from '../../memory-routing/types.js';

const mockProvider: MemoryRoutingProvider = {
  id: 'test-repertoire',
  name: 'Test Repertoire',
  isAvailable: () => true,
  buildRoutingContext: (operation) => ({
    providerId: 'test-repertoire',
    matchedSignals: operation.includes('attestation') ? ['attestation-as-map'] : [],
    matchedTags: operation.includes('trap') ? ['ontological-trap'] : [],
    flags: { ontologicalTrapDetected: operation.includes('trap') },
    synthesisAvailable: false,
    signalConfidences: operation.includes('attestation')
      ? { 'attestation-as-map': 0.92 }
      : {},
    avgMatchConfidence: operation.includes('attestation') ? 0.92 : 0,
  }),
  enhanceAgentCapabilities: (base) => base,
  enrichTasks: (tasks) => tasks,
  buildInheritedContext: () => ({
    providerId: 'test-repertoire',
    matchedSignals: [],
    flags: {},
  }),
  selectAgent: () => 'architect',
  resolveThinDispatch: (baseAgent) => ({
    agent: baseAgent,
    adjustedScore: 30,
    context: {
      providerId: 'test-repertoire',
      matchedSignals: [],
      matchedTags: [],
      flags: {},
      synthesisAvailable: false,
    },
  }),
  getTaskConfidence: (task) => {
    const trap = task.description.includes('ontological-trap');
    return {
      signals: trap ? [{ name: 'attestation-as-map', confidence: 0.92 }] : [],
      matchedSignals: trap ? ['attestation-as-map'] : [],
      avgConfidence: trap ? 0.92 : 0,
      maxConfidence: trap ? 0.92 : 0,
      highConfidenceTrapPresent: trap,
      ontologicalTrapDetected: trap,
      complexityBoost: trap ? 19 : 0,
      recommendedAgent: trap ? 'architect' : null,
    };
  },
};

vi.mock('../../memory-routing/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../memory-routing/index.js')>();
  return {
    ...actual,
    getMemoryRoutingProviderSync: () => mockProvider,
  };
});

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('researcher-confidence', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
    vi.clearAllMocks();
  });

  it('queries confidence when ontological-trap language is present', async () => {
    const {
      shouldQueryRepertoireConfidence,
      resolveResearcherMemoryContext,
      buildMemoryRoutingEvidence,
    } = await import('../../mcps/researcher-confidence.js');

    expect(
      shouldQueryRepertoireConfidence(
        'TYPE: ontological-trap attestation-as-map closure required',
        'governance',
      ),
    ).toBe(true);

    const context = resolveResearcherMemoryContext({
      proposalTitle: 'Trap review',
      proposalDescription:
        'TYPE: ontological-trap attestation-as-map requires consumer-side revalidation.',
      proposalType: 'governance',
    });

    expect(context).not.toBeNull();
    expect(context?.confidence.highConfidenceTrapPresent).toBe(true);
    expect(context?.matchedSignals).toContain('attestation-as-map');
    expect(context?.recommendedAgent).toBe('architect');
    expect(context?.triggeredBy).toBe('trap-language');

    const evidence = buildMemoryRoutingEvidence(context!);
    expect(evidence.some((line) => line.includes('Recommended agent'))).toBe(true);
    expect(evidence.some((line) => line.includes('Complexity boost: 19'))).toBe(true);
  });

  it('queries confidence when high-confidence primitives match without trap language', async () => {
    const { resolveResearcherMemoryContext } = await import(
      '../../mcps/researcher-confidence.js'
    );

    const context = resolveResearcherMemoryContext({
      proposalTitle: 'Attestation boundary',
      proposalDescription:
        'Consumer must revalidate attestation-as-map at the trust boundary.',
      proposalType: 'design',
    });

    expect(context).not.toBeNull();
    expect(context?.triggeredBy).toBe('high-confidence-primitives');
    expect(context?.matchedSignals).toContain('attestation-as-map');
  });

  it('returns null when no trap language or high-confidence primitives are present', async () => {
    const { resolveResearcherMemoryContext } = await import(
      '../../mcps/researcher-confidence.js'
    );

    const context = resolveResearcherMemoryContext({
      proposalTitle: 'Routine refactor',
      proposalDescription: 'Rename helper functions for readability.',
      proposalType: 'refactor',
    });

    expect(context).toBeNull();
  });
});