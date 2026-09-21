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
    expect(text).toMatch(/npm publish --access public/);
    expect(text).toMatch(/Do \*\*not\*\* press Enter/);
    expect(text).toMatch(/every time run `npm publish --access public`/);
    expect(text).toMatch(/Do \*\*not\*\* ask the human to type a 6-digit authenticator code/);
    expect(text).toMatch(/do \*\*not\*\* `npm logout`/);
    expect(text).not.toMatch(/If the CLI returns `EOTP`.*`npm logout`/);
    expect(text).toMatch(/Do not move on until the new version is polled live/);
    expect(text).toMatch(/Registry install \(live verify\)/);
    expect(text).toMatch(/npm view` is not an install/);
    expect(text).toMatch(/REQUIRED_PACK_PATHS/);
    expect(text).toMatch(/Peer boot/);
    expect(text).toMatch(/bc-49e17122-b167-5204-a36f-e62a6e2aba00/);
    expect(text).toMatch(/Fresh \+ upgrade live-verify/);
    expect(text).toMatch(/leftover `\.opencode\/init\.sh`/);
    expect(text).toMatch(/Always a branch/);
    expect(text).toMatch(/Always a PR/);
    expect(text).toMatch(/Subject review\. Fix n ship/);
    expect(text).toMatch(/Loop until `\.xray\/state\/STATION\.md` is done/);
    expect(text).toMatch(/Do not use pacer timeouts as the work clock/);
    expect(text).toMatch(/Clean ticks \(every cycle\)/);
    expect(text).toMatch(/Name-dedupe is not a rewrite/);
    expect(text).toMatch(/Do not act on the stale prompt/);
    expect(text).toMatch(/Idle stop/);
    expect(text).toMatch(/WAVEBOARD are not active|WAVEBOARD are idle/);
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
    expect(readFileSync(orchestrator, 'utf8')).toMatch(/Clean ticks every cycle/);
    expect(readFileSync(orchestrator, 'utf8')).toMatch(/WAVEBOARD are idle/);
    expect(readFileSync(orchestrator, 'utf8')).toMatch(/Subject review\. Fix n ship/);
    expect(readFileSync(agents, 'utf8')).toMatch(/LEAD-CADENCE\.md/);
    expect(existsSync(path.join(root, 'src', 'skills', 'lead-cadence', 'SKILL.md'))).toBe(false);
  });
});
