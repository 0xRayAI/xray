import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetMemoryRoutingProvider } from '../../memory-routing/provider-registry.js';
import {
  LESSON_TEXT_CAP,
  type MemoryRoutingProvider,
  type MemorySignalLessons,
} from '../../memory-routing/types.js';
import type { ResearcherMemoryContext } from '../../mcps/researcher-confidence.js';

const MATCHED_LESSON =
  'I tried treating the attestation as the map. The check failed closed. Revalidate on the consumer side.';
const UNMATCHED_LESSON = 'unmatched speech stays off this task';

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
    lessons: [
      {
        name: 'attestation-as-map',
        definition: 'A map is not a proof.',
        lines: [
          {
            taskId: 'named:attestation-as-map:s1',
            decision: 'success',
            text: MATCHED_LESSON,
            at: '2026-09-24T00:00:00.000Z',
          },
          {
            taskId: 'named:attestation-as-map:empty',
            decision: 'failure',
            text: '',
            at: '2026-09-24T00:00:00.000Z',
          },
        ],
      },
      {
        name: 'unmatched-law',
        definition: 'This law did not match the task.',
        lines: [
          {
            taskId: 'named:unmatched-law:s1',
            decision: 'success',
            text: UNMATCHED_LESSON,
            at: '2026-09-24T00:00:00.000Z',
          },
        ],
      },
    ],
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

const mockInitializeMemoryRouting = vi.fn();

vi.mock('../../memory-routing/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../memory-routing/index.js')>();
  return {
    ...actual,
    getMemoryRoutingProvider: vi.fn().mockResolvedValue(mockProvider),
    getMemoryRoutingProviderSync: () => mockProvider,
    initializeMemoryRouting: mockInitializeMemoryRouting,
  };
});

vi.mock('../../governance/llm-governance-provider.js', () => ({
  tryLLMGovernance: vi.fn().mockResolvedValue(null),
  isGovernanceLlmConfigured: () => false,
}));

vi.mock('../../core/framework-logger.js', () => ({
  frameworkLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));

describe('researcher Repertoire wiring', () => {
  beforeEach(() => {
    resetMemoryRoutingProvider();
    vi.clearAllMocks();
  });

  it('calls initializeMemoryRouting on server construction', async () => {
    const { XrayLibrarianServer } = await import('../../mcps/researcher.server.js');
    new XrayLibrarianServer();

    expect(mockInitializeMemoryRouting).toHaveBeenCalledTimes(1);
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
    expect(text).toContain(`lesson: attestation-as-map: ${MATCHED_LESSON}`);
    expect(text).not.toContain(UNMATCHED_LESSON);
    expect(text).not.toContain('graded');

    const { resolveResearcherMemoryContext, buildMemoryRoutingEvidence } = await import(
      '../../mcps/researcher-confidence.js'
    );
    const context = await resolveResearcherMemoryContext({
      proposalTitle: 'Trap governance review',
      proposalDescription:
        'TYPE: ontological-trap attestation-as-map requires consumer-side revalidation.',
      proposalType: 'governance',
    });
    const evidence = buildMemoryRoutingEvidence(context!).join('\n');
    expect(evidence).toContain(`Lesson: attestation-as-map: ${MATCHED_LESSON}`);
    expect(evidence).not.toContain(UNMATCHED_LESSON);
    expect(evidence).not.toContain('graded');
  });

  it('keeps empty lesson text and unmatched lessons off the routing block', async () => {
    const { formatMemoryRoutingBlock, buildMemoryRoutingEvidence } = await import(
      '../../mcps/researcher-confidence.js'
    );
    const empty: MemorySignalLessons = {
      name: 'attestation-as-map',
      definition: 'A map is not a proof.',
      lines: [
        {
          taskId: 'named:attestation-as-map:empty',
          decision: 'failure',
          text: '',
          at: '2026-09-24T00:00:00.000Z',
        },
      ],
    };
    const unmatched: MemorySignalLessons = {
      name: 'unmatched-law',
      definition: 'This law did not match the task.',
      lines: [
        {
          taskId: 'named:unmatched-law:s1',
          decision: 'success',
          text: UNMATCHED_LESSON,
          at: '2026-09-24T00:00:00.000Z',
        },
      ],
    };
    const context = memoryContext([empty, unmatched]);
    const block = formatMemoryRoutingBlock(context);
    const evidence = buildMemoryRoutingEvidence(context);

    expect(block).toContain('matchedSignals: attestation-as-map');
    expect(block).toContain('complexityBoost: 19');
    expect(block).not.toContain('lesson:');
    expect(block).not.toContain('graded');
    expect(block).not.toContain(UNMATCHED_LESSON);
    expect(evidence.join('\n')).not.toContain('Lesson:');
    expect(evidence.join('\n')).not.toContain(UNMATCHED_LESSON);
    expect(evidence.some((line) => line.includes('Complexity boost: 19'))).toBe(true);
  });

  it('caps matched lesson speech at the stored lesson line cap', async () => {
    const { formatMemoryRoutingBlock, buildMemoryRoutingEvidence } = await import(
      '../../mcps/researcher-confidence.js'
    );
    const speech = `${'a'.repeat(LESSON_TEXT_CAP)}OVERFLOW`;
    const context = memoryContext([
      {
        name: 'attestation-as-map',
        definition: 'A map is not a proof.',
        lines: [
          {
            taskId: 'named:attestation-as-map:long',
            decision: 'success',
            text: speech,
            at: '2026-09-24T00:00:00.000Z',
          },
        ],
      },
    ]);
    const block = formatMemoryRoutingBlock(context);
    const evidence = buildMemoryRoutingEvidence(context).join('\n');
    const capped = 'a'.repeat(LESSON_TEXT_CAP);

    expect(block).toContain(`lesson: attestation-as-map: ${capped}`);
    expect(block).not.toContain('OVERFLOW');
    expect(evidence).toContain(`Lesson: attestation-as-map: ${capped}`);
    expect(evidence).not.toContain('OVERFLOW');
  });
});

function memoryContext(lessons: MemorySignalLessons[]): ResearcherMemoryContext {
  return {
    providerId: 'test-repertoire',
    confidence: {
      signals: [{ name: 'attestation-as-map', confidence: 0.92 }],
      matchedSignals: ['attestation-as-map'],
      avgConfidence: 0.92,
      maxConfidence: 0.92,
      highConfidenceTrapPresent: true,
      ontologicalTrapDetected: true,
      complexityBoost: 19,
      recommendedAgent: 'architect',
    },
    matchedSignals: ['attestation-as-map'],
    recommendedAgent: 'architect',
    triggeredBy: 'trap-language',
    lessons,
  };
}