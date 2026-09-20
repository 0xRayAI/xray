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
    expect(text).toMatch(/Dummy exists to \*\*test `SKILLS\.md`\*\*/);
    expect(text).toMatch(/Same-sess bodies exist to \*\*keep context\*\*/);
    expect(text).toMatch(/[Ss]pawn the browser for OTP/);
    expect(text).toMatch(/Do not move on until the new version is polled live/);
    expect(text).toMatch(/Always a branch/);
    expect(text).toMatch(/Always a PR/);
    expect(text).toMatch(/Loop until `\.xray\/state\/STATION\.md` is done/);
    expect(text).toMatch(/Do not use pacer timeouts as the work clock/);
    expect(text).toMatch(/Board clock \(honest design\)/);
    expect(text).toMatch(/Two idle pacers/);
    expect(text).toMatch(/subscribe_github_pr/);
    expect(text).toMatch(/Dispatch \(not a script\)/);
    expect(text).toMatch(/When knowledge grows/);
    expect(text).toMatch(/Wear, then review/);
    expect(text).toMatch(/Metamorphosis \(how an LLM becomes OP-PROC\)/);
    expect(text).toMatch(/in-context seats/);
    expect(text).toMatch(/Decision matrix to ship \(lead-owned\)/);
    expect(text).toMatch(/A — PR \+ CI/);
    expect(text).toMatch(/release:docs-check/);
    expect(text).toMatch(/foundry release/);
    expect(text).toMatch(/Green CI is not publish/);
    expect(text).not.toMatch(/npm, Railway, spend, credentials — Ask-first/);
    expect(readFileSync(catalog, 'utf8')).toMatch(/LEAD-CADENCE\.md/);
  });

  it('rewires worn lead surfaces — no new skill file', () => {
    expect(readFileSync(orchestrator, 'utf8')).toMatch(/Lead cadence \(syncopation\)/);
    expect(readFileSync(agents, 'utf8')).toMatch(/LEAD-CADENCE\.md/);
    expect(existsSync(path.join(root, 'src', 'skills', 'lead-cadence', 'SKILL.md'))).toBe(false);
  });
});
