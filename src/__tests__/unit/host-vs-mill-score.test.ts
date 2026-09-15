import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

describe('HOST vs mill scoring law', () => {
  it('scores disk and mill-on-machine, not conversation memory', () => {
    const law = readRepo('examples/killer-dual/HOST-VS-MILL.md');
    expect(law).toContain('Chat may lose early turns. Disk must not lose the ticket.');
    expect(readRepo('docs-site/docs/guides/station-vs-repertoire.md')).toContain(
      'Treat same-bc plus a re-fed summary as proof the conversation survived as a mind'
    );
    expect(law).toContain('Station absent is still **PASS**');
    const protocol = readRepo('examples/killer-dual/MEMORY-PROTOCOL.md');
    expect(protocol).toContain('**C memory**');
    expect(protocol).not.toMatch(/C1-episodic=/);
    expect(readRepo('examples/killer-dual/MEMORY-QUIZ.md')).toContain('before any tools');
    expect(law).toContain('not separable');
    expect(law).not.toMatch(/survived as a mind/i);
  });

  it('Arm S receipt does not claim the conversation remembered the ticket', () => {
    const receipt = readRepo('examples/killer-dual/RECEIPT-HOST-PRECOMPACT.md');
    expect(receipt).toContain('Conversation memory');
    expect(receipt).toContain('**not scored**');
    expect(receipt).not.toMatch(/Survive: \*\*yes\*\* \(disk quiz \+ continued the live job\)/);
    expect(receipt).not.toContain('still knew the ticket');
  });

  it('survive-compact skill does not claim the old window survived as a mind', () => {
    const skill = readRepo('grok-bot/skills/survive-compact/SKILL.md');
    expect(skill).toContain('Chat may lose early turns');
    expect(skill).not.toContain('keep mind and work alive');
  });

  it('Arm S Claim C receipt scores summarizer keep, not leftover old-window memory', () => {
    const receipt = readRepo('examples/killer-dual/MEMORY-RECEIPT.md');
    expect(receipt).toContain('**NOT PROVEN** as leftover old-window memory');
    expect(receipt).toContain('re-fed in the injected conversation summary');
    expect(receipt).toContain('Hallucination check **PASS**');
    expect(receipt).not.toMatch(/C1-episodic=/);
    expect(receipt).not.toMatch(/the conversation remembered/);
    const snap = readRepo('examples/killer-dual/cursor-usage-receipt.compact6.json');
    expect(snap).toContain('"preCompactCount": 6');
    expect(snap).not.toMatch(/C1-episodic=/);
  });
});
