import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('lead cadence encode — peer can find the beat', () => {
  const cadence = path.join(root, 'grok-bot', 'ops', 'LEAD-CADENCE.md');
  const catalog = path.join(root, 'grok-bot', 'ops', 'OPS-CATALOG.md');
  const orchestrator = path.join(root, 'src', 'skills', 'orchestrator', 'SKILL.md');
  const agents = path.join(root, 'AGENTS.md');

  it('ships the disk SSOT and catalogs it', () => {
    expect(existsSync(cadence)).toBe(true);
    const text = readFileSync(cadence, 'utf8');
    expect(text).toMatch(/Peer test/);
    expect(text).toMatch(/Live tick/);
    expect(text).toMatch(/A friend would hear:/);
    expect(text).toMatch(/Codex 69/);
    expect(readFileSync(catalog, 'utf8')).toMatch(/LEAD-CADENCE\.md/);
  });

  it('rewires worn lead surfaces — no new skill file', () => {
    expect(readFileSync(orchestrator, 'utf8')).toMatch(/Lead cadence \(syncopation\)/);
    expect(readFileSync(agents, 'utf8')).toMatch(/LEAD-CADENCE\.md/);
    expect(existsSync(path.join(root, 'src', 'skills', 'lead-cadence', 'SKILL.md'))).toBe(false);
  });
});
