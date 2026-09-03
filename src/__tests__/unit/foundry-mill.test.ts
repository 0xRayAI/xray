import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOUNDRY_EXO_CANNOT_SHIP, executeReleaseWorkflow } from '../../enforcement/enforcer-tools.js';
import { VersionComplianceProcessor } from '../../processors/implementations/version-compliance-processor.js';
import { eraFromVersion, buildDocsHeader } from '../../../scripts/node/version-manager.mjs';
import { validateReleaseDocs } from '../../../scripts/node/validate-release-docs.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('foundry mill — one bumper', () => {
  it('eraFromVersion is major.minor, not patch', () => {
    expect(eraFromVersion('4.0.1')).toBe('4.0');
    expect(buildDocsHeader({}, '4.0.1')).toBe('**4.0** — a suit that survives the context window');
  });

  it('version-manager refuses bump and tag', () => {
    for (const arg of ['patch', 'minor', 'major', '1.2.3', '--tag']) {
      const r = spawnSync(process.execPath, ['scripts/node/version-manager.mjs', arg], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(r.status, arg).not.toBe(0);
      expect(`${r.stdout}${r.stderr}`).toMatch(/reconcile-version/);
    }
  });

  it('version-manager source does not rewrite markdown counts', () => {
    const src = read('scripts/node/version-manager.mjs');
    expect(src).not.toMatch(/\\d\+\\s\+Skills\?/);
    expect(src).not.toContain('applyAgentCountUpdates');
    expect(src).not.toContain('createGitTag');
    expect(src).not.toContain('function bumpVersion');
    expect(src).toContain('--artifacts-only');
  });
});

describe('foundry mill — docs verify, do not rewrite', () => {
  it('validate-release-docs passes on era headers + current CHANGELOG', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    const result = validateReleaseDocs(root);
    expect(result.errors, result.errors.join('\n')).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.version).toBe(pkg.version);
  });

  it('does not require the patch version in features-since-3.1', () => {
    const src = read('scripts/node/validate-release-docs.mjs');
    expect(src).not.toContain("rel.includes('features-since-3.1') && !content.includes(version)");
  });

  it('kernel files use era, not a three-part patch stamp on the header line', () => {
    const files = [
      'README.md',
      'AGENTS.md',
      'AGENTS-consumer.md',
      'SKILLS.md',
      'docs-site/docs/index.md',
    ];
    for (const rel of files) {
      const firstKernel = read(rel)
        .split('\n')
        .find((line) => /^\*\*/.test(line) && line.includes('suit that survives'));
      if (firstKernel) {
        expect(firstKernel, rel).not.toMatch(/^\*\*v?\d+\.\d+\.\d+\*\*/);
      }
    }
  });
});

describe('foundry mill — exo cannot ship', () => {
  it('executeReleaseWorkflow is blocked and does not spawn a bumper', async () => {
    const result = await executeReleaseWorkflow(
      'ship it',
      { files: [] },
      'test-job',
      { suggestedAgent: 'enforcer', suggestedSkill: '', confidence: 1, matchedKeyword: 'release-workflow' },
    );
    expect(result.blocked).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain(FOUNDRY_EXO_CANNOT_SHIP);
  });

  it('enforcer-tools no longer execs version-manager bump or npm publish', () => {
    const src = read('src/enforcement/enforcer-tools.ts');
    expect(src).not.toContain('version-manager.mjs ${bumpType}');
    expect(src).not.toContain('git add -A && git commit');
    expect(src).toContain('FOUNDRY_EXO_CANNOT_SHIP');
  });
});

describe('foundry mill — gate and scripts', () => {
  it('full release-gate runs docs validation', () => {
    const src = read('scripts/node/release-gate.mjs');
    expect(src).toContain('3/7 Release docs');
    expect(src).toContain('validate-release-docs.mjs');
  });

  it('package.json version scripts do not pass a bump type', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.version).toBe('node scripts/node/version-manager.mjs');
    expect(pkg.scripts['version:bump']).toContain('reconcile-version.mjs');
    expect(pkg.scripts['version:sync']).toContain('--artifacts-only');
    expect(pkg.scripts['version:reconcile']).toContain('reconcile-version.mjs');
    expect(pkg.scripts['enforce:versions']).toContain('validate-release-docs.mjs');
  });

  it('CI mill workflow is on main and does not run UVM', () => {
    const yml = read('.github/workflows/enforce-version-compliance.yml');
    expect(yml).toContain('branches: [main]');
    expect(yml).not.toContain('master');
    expect(yml).not.toContain('universal-version-manager');
    expect(yml).toContain('release:docs-check');
    expect(yml).toContain('foundry-mill.test.ts');
  });

  it('UVM standardizeVersions remains a no-op freeze', () => {
    const src = read('scripts/node/universal-version-manager.js');
    expect(src).toContain('Mass JSON version replace is disabled');
    expect(src).toMatch(/standardizeVersions[\s\S]*return;/);
  });

  it('VersionComplianceProcessor uses package.json SSOT, not UVM 1-ahead', async () => {
    const proc = new VersionComplianceProcessor(root);
    const result = await proc.validateVersionCompliance();
    expect(result.uvmVersion).toBe('FROZEN');
    expect(result.compliant).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.fixes?.some((f) => f.command.includes('universal-version-manager'))).toBeFalsy();
  });
});
