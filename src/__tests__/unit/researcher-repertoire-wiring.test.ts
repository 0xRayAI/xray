import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMemoryRoutingProvider } from '../../memory-routing/provider-registry.js';
import type { MemoryRoutingProvider } from '../../memory-routing/types.js';

const mockProvider: MemoryRoutingProvider = {
  id: 'test-repertoire',
  name: 'Test Repertoire',
  isAvailable: () => true,
  buildRoutingContext: () => ({
    providerId: 'test-repertoire',
    matchedSignals: ['attestation-as-map'],
    matchedTags: ['ontological-trap'],
    flags: { ontologicalTrapDetected: true },
    synthesisAvailable: false,
    signalConfidences: { 'attestation-as-map': 0.92 },
    avgMatchConfidence: 0.92,
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
  getTaskConfidence: () => ({
    signals: [{ name: 'attestation-as-map', confidence: 0.92 }],
    matchedSignals: ['attestation-as-map'],
    avgConfidence: 0.92,
    maxConfidence: 0.92,
    highConfidenceTrapPresent: true,
    ontologicalTrapDetected: true,
    complexityBoost: 19,
    recommendedAgent: 'architect',
  }),
};

vi.mock('../../memory-routing/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../memory-routing/index.js')>();
  return {
    ...actual,
    getMemoryRoutingProviderSync: () => mockProvider,
  };
});

vi.mock('../../governance/llm-governance-provider.js', () => ({
  tryLLMGovernance: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('researcher Repertoire wiring', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
    vi.clearAllMocks();
  });

  it('injects MEMORY_ROUTING block when high-confidence trap is detected', async () => {
    const { XrayLibrarianServer } = await import('../../mcps/researcher.server.js');
    const server = new XrayLibrarianServer();

    const result = await server.analyzeProposal({
      proposalTitle: 'Trap governance review',
      proposalDescription:
        'TYPE: ontological-trap attestation-as-map requires consumer-side revalidation.',
      proposalType: 'governance',
    });

    const text = result.content[0]?.text ?? '';
    expect(text).toContain('MEMORY_ROUTING:');
    expect(text).toContain('recommendedAgent: architect');
    expect(text).toContain('complexityBoost: 19');
    expect(text).toContain('matchedSignals: attestation-as-map');
    expect(text).toContain('high-confidence ontological trap');
  });
});