import { frameworkLogger } from '../core/framework-logger.js';
import { getMemoryRoutingProviderSync } from '../memory-routing/index.js';
import type {
  MemoryRoutingContext,
  MemoryTaskConfidence,
} from '../memory-routing/types.js';

const TRAP_LANGUAGE = /TYPE:\s*ontological-trap|ontological[- ]trap/i;
const DEFAULT_MIN_CONFIDENCE_GATE = 0.55;

export interface ResearcherMemoryContext {
  providerId: string;
  confidence: MemoryTaskConfidence;
  matchedSignals: string[];
  recommendedAgent: string | null;
  triggeredBy: 'trap-language' | 'high-confidence-primitives';
}

export function shouldQueryRepertoireConfidence(
  description: string,
  proposalType = '',
): boolean {
  const text = `${description} ${proposalType}`.trim();
  return TRAP_LANGUAGE.test(text);
}

export function hasHighConfidencePrimitiveMatch(
  routingContext: MemoryRoutingContext,
  minConfidence = DEFAULT_MIN_CONFIDENCE_GATE,
): boolean {
  const confidences = routingContext.signalConfidences ?? {};
  return Object.values(confidences).some((confidence) => confidence >= minConfidence);
}

function buildTaskText(
  proposalTitle: string,
  proposalDescription: string,
  proposalType: string,
): string {
  return [proposalTitle, proposalDescription, proposalType].filter(Boolean).join('\n');
}

/**
 * Resolve Repertoire task confidence for researcher proposal analysis.
 * Triggered by ontological-trap language or high-confidence primitive matches.
 */
export function resolveResearcherMemoryContext(input: {
  proposalTitle?: string;
  proposalDescription?: string;
  proposalType?: string;
}): ResearcherMemoryContext | null {
  const proposalTitle = input.proposalTitle ?? '';
  const proposalDescription = input.proposalDescription ?? '';
  const proposalType = input.proposalType ?? '';
  const taskText = buildTaskText(proposalTitle, proposalDescription, proposalType);

  const provider = getMemoryRoutingProviderSync();
  if (provider.id === 'null' || !provider.getTaskConfidence) {
    return null;
  }

  const trapLanguageDetected = shouldQueryRepertoireConfidence(
    proposalDescription,
    proposalType,
  );
  const routingContext = provider.buildRoutingContext(taskText);
  const primitiveMatchDetected = hasHighConfidencePrimitiveMatch(routingContext);

  if (!trapLanguageDetected && !primitiveMatchDetected) {
    return null;
  }

  const confidence = provider.getTaskConfidence({
    id: 'researcher-proposal',
    description: taskText,
    type: proposalType || 'governance',
  });

  const matchedSignals =
    confidence.matchedSignals.length > 0
      ? confidence.matchedSignals
      : routingContext.matchedSignals;

  const context: ResearcherMemoryContext = {
    providerId: provider.id,
    confidence,
    matchedSignals,
    recommendedAgent: confidence.recommendedAgent,
    triggeredBy: trapLanguageDetected ? 'trap-language' : 'high-confidence-primitives',
  };

  if (confidence.highConfidenceTrapPresent) {
    frameworkLogger.log('mcps/researcher', 'repertoire-trap-detected', 'info', {
      providerId: provider.id,
      matchedSignals,
      complexityBoost: confidence.complexityBoost,
      recommendedAgent: confidence.recommendedAgent,
      triggeredBy: context.triggeredBy,
    });
  }

  return context;
}

export function buildMemoryRoutingEvidence(
  context: ResearcherMemoryContext,
): string[] {
  const { confidence, matchedSignals, recommendedAgent } = context;
  const signalSummary = confidence.signals
    .map((entry) => `${entry.name} (${entry.confidence.toFixed(2)})`)
    .join(', ');

  const lines = [
    `Repertoire memory routing (${context.providerId}, trigger: ${context.triggeredBy})`,
    `Matched signals: ${matchedSignals.join(', ') || 'none'}`,
    `Signal confidences: ${signalSummary || 'none'}`,
    `High-confidence trap present: ${confidence.highConfidenceTrapPresent}`,
    `Complexity boost: ${confidence.complexityBoost}`,
  ];

  if (recommendedAgent) {
    lines.push(`Recommended agent for trap handling: ${recommendedAgent}`);
  }

  return lines;
}

export function formatMemoryRoutingBlock(context: ResearcherMemoryContext): string {
  const { confidence, matchedSignals, recommendedAgent } = context;
  const lines = [
    'MEMORY_ROUTING:',
    `  provider: ${context.providerId}`,
    `  trigger: ${context.triggeredBy}`,
    `  matchedSignals: ${matchedSignals.join(', ') || 'none'}`,
    `  highConfidenceTrapPresent: ${confidence.highConfidenceTrapPresent}`,
    `  complexityBoost: ${confidence.complexityBoost}`,
  ];

  if (recommendedAgent) {
    lines.push(`  recommendedAgent: ${recommendedAgent}`);
  }

  return lines.join('\n');
}