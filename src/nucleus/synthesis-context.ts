/**
 * Collocated context for synthesis Aside — codex + plan + memory routing provider.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getMemoryRoutingProviderSync } from '../memory-routing/index.js';

export interface SynthesisCollocatedContext {
  primitive: 'synthesis';
  dueReason: string | null;
  codexTermCount: number;
  codexExcerpt: string;
  planExcerpt: string;
  memoryContext?: Record<string, unknown>;
  collatedText: string;
}

function readCodexExcerpt(projectRoot: string, maxChars = 1200): { termCount: number; excerpt: string } {
  const codexPath = path.join(projectRoot, '.xray', 'codex.json');
  if (!fs.existsSync(codexPath)) {
    return { termCount: 0, excerpt: '' };
  }
  try {
    const data = JSON.parse(fs.readFileSync(codexPath, 'utf8')) as {
      terms?: Array<{ id?: number; rule?: string; title?: string }>;
    };
    const terms = data.terms ?? [];
    const lines = terms.slice(0, 12).map((t) => {
      const label = t.title ?? t.rule ?? '';
      return t.id != null ? `${t.id}. ${label}` : label;
    });
    const excerpt = lines.join('\n').slice(0, maxChars);
    return { termCount: terms.length, excerpt };
  } catch {
    return { termCount: 0, excerpt: '' };
  }
}

function readPlanExcerpt(projectRoot: string, maxChars = 1200): string {
  const planPath = path.join(projectRoot, '.xray', 'state', 'lead-dev-plan.json');
  if (!fs.existsSync(planPath)) return '';
  try {
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as {
      active?: boolean;
      phases?: Array<{
        id: string;
        name?: string;
        todos: Array<{ id: string; task: string; status: string; subagent?: string }>;
      }>;
    };
    const phases = plan.phases ?? [];
    const lines: string[] = [`active: ${plan.active !== false}`];
    for (const phase of phases) {
      lines.push(`## ${phase.id}${phase.name ? ` — ${phase.name}` : ''}`);
      for (const todo of phase.todos) {
        lines.push(`- [${todo.status}] ${todo.id} (${todo.subagent ?? 'agent'}): ${todo.task}`);
      }
    }
    return lines.join('\n').slice(0, maxChars);
  } catch {
    return '';
  }
}

export function buildSynthesisCollocatedContext(
  projectRoot = process.cwd(),
  dueReason: string | null = null,
): SynthesisCollocatedContext {
  const codex = readCodexExcerpt(projectRoot);
  const planExcerpt = readPlanExcerpt(projectRoot);

  let memoryContext: Record<string, unknown> | undefined;
  try {
    const provider = getMemoryRoutingProviderSync();
    if (provider.isAvailable() && provider.buildSynthesisContext) {
      memoryContext = provider.buildSynthesisContext({ projectRoot }) ?? undefined;
    }
  } catch {
    memoryContext = undefined;
  }

  const sections = [
    '# Synthesis checkpoint',
    dueReason ? `Due: ${dueReason}` : '',
    codex.excerpt ? `## Codex (${codex.termCount} terms)\n${codex.excerpt}` : '',
    planExcerpt ? `## Lead-dev plan\n${planExcerpt}` : '',
    memoryContext?.collatedText
      ? `## Memory routing\n${String(memoryContext.collatedText)}`
      : memoryContext?.synthesisExcerpt
        ? `## Prior synthesis\n${String(memoryContext.synthesisExcerpt)}`
        : '',
  ].filter(Boolean);

  return {
    primitive: 'synthesis',
    dueReason,
    codexTermCount: codex.termCount,
    codexExcerpt: codex.excerpt,
    planExcerpt,
    ...(memoryContext ? { memoryContext } : {}),
    collatedText: sections.join('\n\n'),
  };
}