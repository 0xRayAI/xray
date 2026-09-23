import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SHIPPED_GUIDE_STRIP_FILES,
  SHIPPED_OP_PROC_STRIP_FILES,
  isPatchRefStripRefused,
  patchRefStripRelPaths,
  stripLivePatchRefs,
  stripPatchRefFile,
  stripPatchRefText,
} from '../../../scripts/foundry/version-manager.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('version manager patch-ref strip set', () => {
  it('strips shipped guides and shipped OP-PROC, and refuses seat memory', () => {
    const paths = patchRefStripRelPaths();
    expect(paths).toEqual([...SHIPPED_GUIDE_STRIP_FILES, ...SHIPPED_OP_PROC_STRIP_FILES]);
    expect(paths).toContain('docs-site/docs/guides/memory-wake.md');
    expect(paths).toContain('docs-site/docs/guides/getting-started.md');
    expect(paths).toContain('README.md');
    expect(paths).toContain('grok-bot/ops/LEAD-CADENCE.md');
    expect(paths).toContain('src/skills/orchestrator/SKILL.md');
    expect(paths).toContain('grok-bot/skills/ship-ready-mill-gate/SKILL.md');
    expect(paths).not.toContain('CHANGELOG.md');
    expect(paths).not.toContain('docs-site/docs/guides/features-since-3.1.md');

    for (const rel of paths) {
      expect(isPatchRefStripRefused(rel), rel).toBe(false);
      expect(rel.startsWith('.xray/state'), rel).toBe(false);
      expect(rel.endsWith('NOTES.md'), rel).toBe(false);
      expect(rel.endsWith('curated_signals.json'), rel).toBe(false);
      expect(rel.startsWith('node_modules'), rel).toBe(false);
    }

    expect(isPatchRefStripRefused('.xray/state/STATION.md')).toBe(true);
    expect(isPatchRefStripRefused('.xray/state/NOTES.md')).toBe(true);
    expect(isPatchRefStripRefused('.xray/state/repertoire/curated_signals.json')).toBe(true);
    expect(isPatchRefStripRefused('node_modules/0xray/README.md')).toBe(true);
    expect(isPatchRefStripRefused('docs-site/../../.xray/state/STATION.md')).toBe(true);

    const src = readFileSync(path.join(root, 'scripts/foundry/version-manager.mjs'), 'utf8');
    expect(src).not.toContain('npm publish');
    expect(src).not.toContain('function bumpVersion');
  });

  it('removes the live patch ref and leaves changelog stamps', () => {
    const input = [
      'Wear 0xray@9.9.9 today.',
      'npm is **9.9.9**',
      'Product **9.9.9** is on npm',
      'Do not republish 9.9.9',
      'This cut is 9.9.9',
      'This cut is **9.9.9**',
      '## [9.9.9] - 2026-01-01',
      'Older pin 0xray@1.2.3 stays.',
    ].join('\n');
    const out = stripPatchRefText(input, '9.9.9');
    expect(out).not.toContain('0xray@9.9.9');
    expect(out).not.toContain('npm is **9.9.9**');
    expect(out).not.toContain('Product **9.9.9** is on npm');
    expect(out).not.toContain('Do not republish 9.9.9');
    expect(out).not.toContain('This cut is 9.9.9');
    expect(out).not.toContain('This cut is **9.9.9**');
    expect(out).toContain('## [9.9.9] - 2026-01-01');
    expect(out).toContain('0xray@1.2.3');
  });

  it('writes shipped prose and leaves Station, NOTES, dest, and node_modules', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-strip-'));
    const version = '9.9.9';
    const pin = `live 0xray@${version} stays`;
    try {
      const guide = 'docs-site/docs/guides/memory-wake.md';
      const opproc = 'grok-bot/ops/LEAD-CADENCE.md';
      mkdirSync(path.dirname(path.join(tmp, guide)), { recursive: true });
      mkdirSync(path.dirname(path.join(tmp, opproc)), { recursive: true });
      mkdirSync(path.join(tmp, '.xray/state/repertoire'), { recursive: true });
      mkdirSync(path.join(tmp, 'node_modules/0xray'), { recursive: true });
      writeFileSync(path.join(tmp, guide), pin);
      writeFileSync(path.join(tmp, opproc), pin);
      writeFileSync(path.join(tmp, 'CHANGELOG.md'), `## [${version}] - 2026-01-01\n\n- ${pin}\n`);
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'acme', version }, null, 2)}\n`);
      const refused = [
        '.xray/state/STATION.md',
        '.xray/state/NOTES.md',
        '.xray/state/repertoire/curated_signals.json',
        'node_modules/0xray/README.md',
      ];
      for (const rel of refused) writeFileSync(path.join(tmp, rel), pin);

      const changed = stripLivePatchRefs(tmp, version);
      expect(changed).toContain(guide);
      expect(changed).toContain(opproc);
      expect(readFileSync(path.join(tmp, guide), 'utf8')).not.toContain(`0xray@${version}`);
      expect(readFileSync(path.join(tmp, opproc), 'utf8')).not.toContain(`0xray@${version}`);
      expect(readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8')).toContain(`0xray@${version}`);
      expect(JSON.parse(readFileSync(path.join(tmp, 'package.json'), 'utf8')).version).toBe(version);
      for (const rel of refused) {
        expect(stripPatchRefFile(tmp, rel, version)).toBe(false);
        expect(readFileSync(path.join(tmp, rel), 'utf8')).toBe(pin);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
