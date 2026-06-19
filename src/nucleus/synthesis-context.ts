/**
 * Collocated context for synthesis Aside — delegates to memory routing provider SSOT.
 */

import { getMemoryRoutingProvider } from '../memory-routing/index.js';

export interface SynthesisCollocatedContext {
  primitive: 'synthesis';
  dueReason: string | null;
  collatedText: string;
  matchedSignals?: Array<{ name: string; definition: string; priority: string }>;
  codexTermCount?: number;
  codexExcerpt?: string;
  planExcerpt?: string;
  synthesisExcerpt?: string;
}

function fallbackContext(dueReason: string | null): SynthesisCollocatedContext {
  const lines = [
    '# Synthesis checkpoint',
    dueReason ? `Due: ${dueReason}` : '',
    '(Enable memory_routing with Repertoire for full signal + codex + plan collation)',
  ].filter(Boolean);
  return {
    primitive: 'synthesis',
    dueReason,
    collatedText: lines.join('\n\n'),
  };
}

function normalizeProviderContext(
  raw: Record<string, unknown>,
  dueReason: string | null,
): SynthesisCollocatedContext {
  const collatedText =
    typeof raw.collatedText === 'string' && raw.collatedText.trim()
      ? dueReason && !raw.collatedText.includes('Due:')
        ? `# Synthesis checkpoint\n\nDue: ${dueReason}\n\n${raw.collatedText}`
        : raw.collatedText
      : fallbackContext(dueReason).collatedText;

  const matchedSignals = Array.isArray(raw.matchedSignals)
    ? (raw.matchedSignals as SynthesisCollocatedContext['matchedSignals'])
    : undefined;

  return {
    primitive: 'synthesis',
    dueReason,
    collatedText,
    ...(matchedSignals ? { matchedSignals } : {}),
    ...(typeof raw.codexTermCount === 'number' ? { codexTermCount: raw.codexTermCount } : {}),
    ...(typeof raw.codexExcerpt === 'string' ? { codexExcerpt: raw.codexExcerpt } : {}),
    ...(typeof raw.planExcerpt === 'string' ? { planExcerpt: raw.planExcerpt } : {}),
    ...(typeof raw.synthesisExcerpt === 'string'
      ? { synthesisExcerpt: raw.synthesisExcerpt }
      : {}),
  };
}

export async function buildSynthesisCollocatedContext(
  projectRoot = process.cwd(),
  dueReason: string | null = null,
): Promise<SynthesisCollocatedContext> {
  try {
    const provider = await getMemoryRoutingProvider();
    if (provider.isAvailable() && provider.buildSynthesisContext) {
      const raw = provider.buildSynthesisContext({ projectRoot, dueReason });
      if (raw) return normalizeProviderContext(raw, dueReason);
    }
  } catch {
    // fall through to minimal fallback
  }
  return fallbackContext(dueReason);
}

export function isAnalyzeComplexitySuccess(
  content: Array<{ type: string; text: string }>,
): boolean {
  const text = content.map((c) => c.text).join('\n');
  return !text.includes('❌') && !/^error handling tool/i.test(text);
}

export function appendSynthesisContextToResponse(
  content: Array<{ type: string; text: string }>,
  collatedText: string,
): Array<{ type: string; text: string }> {
  if (!collatedText.trim()) return content;
  const synthesisSection = `

---

## Synthesis checkpoint — collocated context

${collatedText}

**Next:** Spawn Task for each mandatory consult todo (s.1 researcher, s.2 architect-tools, s.3 code-review). Checkpoint clears only when all consult todos complete.`;
  if (content.length === 0) {
    return [{ type: 'text', text: synthesisSection.trim() }];
  }
  return content.map((block, index) =>
    index === 0 ? { ...block, text: `${block.text}${synthesisSection}` } : block,
  );
}