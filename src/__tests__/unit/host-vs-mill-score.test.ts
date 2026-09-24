import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepo(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    out.push(full);
  }
  return out;
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
    expect(protocol).toContain('MEMORY-RECEIPT-7.md');
    expect(protocol).toContain('MEMORY-RECEIPT-8.md');
    expect(protocol).toContain('organ-memory');
    expect(protocol).toContain('summarizer keep');
    expect(protocol).toContain('https://cursor.com/docs/hooks');
    expect(protocol).toContain('https://cursor.com/docs/agent/prompting');
    expect(protocol).toContain('https://cursor.com/docs/cloud-agent');
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

  it('Arm S compact 7 receipt still scores summarizer keep after quiz-first cell', () => {
    const receipt = readRepo('examples/killer-dual/MEMORY-RECEIPT-7.md');
    expect(receipt).toContain('**NOT PROVEN** as leftover old-window memory');
    expect(receipt).toContain('re-fed in the injected conversation summary');
    expect(receipt).toContain('working notes');
    expect(receipt).toContain('Hallucination check **PASS**');
    expect(receipt).not.toMatch(/C1-episodic=/);
    expect(receipt).not.toMatch(/the conversation remembered/);
    const snap = readRepo('examples/killer-dual/cursor-usage-receipt.compact7.json');
    expect(snap).toContain('"preCompactCount": 7');
    expect(snap).toContain('"context_tokens": 251144');
    expect(snap).not.toMatch(/C1-episodic=/);
  });

  it('Arm S compact 8 receipt still scores summarizer keep after never-restate fill', () => {
    const receipt = readRepo('examples/killer-dual/MEMORY-RECEIPT-8.md');
    expect(receipt).toContain('**NOT PROVEN** as leftover old-window memory');
    expect(receipt).toContain('re-fed in the injected conversation summary');
    expect(receipt).toContain('plant-once');
    expect(receipt).toContain('Hallucination check **PASS**');
    expect(receipt).not.toMatch(/C1-episodic=/);
    expect(receipt).not.toMatch(/the conversation remembered/);
    const snap = readRepo('examples/killer-dual/cursor-usage-receipt.compact8.json');
    expect(snap).toContain('"preCompactCount": 8');
    expect(snap).toContain('"context_tokens": 244744');
    expect(snap).not.toMatch(/C1-episodic=/);
  });

  it('quiz printer emits questions only and killer-dual docs do not plant canary assignments', () => {
    const quiz = spawnSync('python3', ['examples/killer-dual/memory_quiz.py'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(quiz.status).toBe(0);
    expect(quiz.stdout).toContain('injected conversation summary');
    expect(quiz.stdout).toContain('Organ store');
    expect(quiz.stdout).toContain('organ-memory');
    expect(quiz.stdout).toContain('summarizer-keep');
    expect(quiz.stdout).toContain('bare arm');
    expect(quiz.stdout).not.toContain('episodic nonce (C1)');
    expect(quiz.stdout).not.toMatch(/C1-episodic=/);
    expect(quiz.stdout).not.toMatch(/Answer:/i);
    expect(quiz.stderr).toBe('');

    const leak = /C1-episodic=|C2-task=|C1\s*=\s*\S+|C2\s*=\s*\S+/;
    const dir = path.join(repoRoot, 'examples/killer-dual');
    for (const file of walkFiles(dir)) {
      const body = fs.readFileSync(file, 'utf8');
      expect(body, file).not.toMatch(leak);
    }
  });
});
