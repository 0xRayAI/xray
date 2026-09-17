import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const mapPath = path.join(root, 'grok-bot', 'ops', 'PROCESSORS-MAP-GROK.md');

describe('grok-bot OP PROC map — thin when→call', () => {
  const text = readFileSync(mapPath, 'utf8');
  const lines = text.split('\n');

  it('stays a short map, not the 260-line processor inventory', () => {
    expect(lines.length).toBeLessThanOrEqual(60);
    expect(text).not.toMatch(/preValidate|errorBoundary|logProtection|coverageAnalysis|publishPreflight/);
    expect(text).not.toMatch(/## 1\. ProcessorManager/);
  });

  it('names live host + mill/git/release calls from the §7 slots', () => {
    expect(text).toMatch(/When.*Call/s);
    expect(text).toMatch(/evaluatePreToolGate|pre-tool-use\.js/);
    expect(text).toMatch(/runGrokPostprocessorLight/);
    expect(text).toMatch(/pre-commit/);
    expect(text).toMatch(/@0xray\/foundry gate/);
    expect(text).toMatch(/@0xray\/foundry inspect/);
  });

  it('lists what not to treat as bot release gates', () => {
    expect(text).toMatch(/Skip/i);
    expect(text).toMatch(/processor-pipeline/);
    expect(text).toMatch(/PostProcessor/);
    expect(text).toMatch(/PROCESSOR_DEFS|nudge|storytellingTrigger/);
  });
});
