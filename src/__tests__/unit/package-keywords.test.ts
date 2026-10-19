import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Published npm keywords. Hermes and OpenClaw stay. A marketing rewrite is not this list. */
const published = [
  'ai',
  'opencode',
  'hermes',
  'openclaw',
  'grok',
  'mcp',
  'agent',
  'orchestration',
  'codex',
  'error-prevention',
  'multi-agent',
  'framework',
  'governance',
  'cli',
  'tui',
  'hallucination-prevention',
  'ai-slop-prevention',
  'terminal-ai',
  'ai-assistant',
  'plugin-system',
];

describe('package keywords', () => {
  it('keeps the published list, including hermes and openclaw', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { keywords: string[] };
    expect(pkg.keywords).toEqual(published);
    expect(pkg.keywords).not.toContain('agent-fleet');
    expect(pkg.keywords).not.toContain('self-improving-agents');
  });
});
