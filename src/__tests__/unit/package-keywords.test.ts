import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Fleet roster on the package. Hermes and OpenClaw stay with the other hosts. */
const fleetRoster = [
  'ai',
  'agent',
  'multi-agent',
  'agent-fleet',
  'bot-fleet',
  'orchestration',
  'governance',
  'mcp',
  'cli',
  'tui',
  'grok',
  'grok-bot',
  'cursor',
  'codex',
  'opencode',
  'hermes',
  'openclaw',
  'claude-code',
  'goggles',
  'ai-suit',
  'op-proc',
  'self-improving-agents',
];

describe('package keywords', () => {
  it('keeps the fleet roster, including hermes and openclaw', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { keywords: string[] };
    expect(pkg.keywords).toEqual(fleetRoster);
    expect(pkg.keywords).toContain('hermes');
    expect(pkg.keywords).toContain('openclaw');
  });
});
