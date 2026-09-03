import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOUNDRY_EXO_CANNOT_SHIP, executeReleaseWorkflow } from '../../enforcement/enforcer-tools.js';
import { VersionComplianceProcessor } from '../../processors/implementations/version-compliance-processor.js';
import { eraFromVersion, buildDocsHeader } from '../../../scripts/foundry/version-manager.mjs';
import { validateReleaseDocs } from '../../../scripts/foundry/validate-release-docs.mjs';

const requireCjs = createRequire(import.meta.url);

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
    const src = read('scripts/foundry/version-manager.mjs');
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
    const src = read('scripts/foundry/validate-release-docs.mjs');
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
    const src = read('scripts/foundry/release-gate.mjs');
    expect(src).toContain('3/7 Release docs');
    expect(src).toContain('validate-release-docs.mjs');
  });

  it('package.json version scripts do not pass a bump type', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.version).toContain('scripts/foundry/version-manager.mjs');
    expect(pkg.scripts['version:bump']).toContain('reconcile-version.mjs');
    expect(pkg.scripts['version:sync']).toContain('--artifacts-only');
    expect(pkg.scripts['version:reconcile']).toContain('reconcile-version.mjs');
    expect(pkg.scripts['enforce:versions']).toContain('validate-release-docs.mjs');
    expect(pkg.scripts['release:npm']).toContain('--publish-only');
  });

  it('CI mill workflow is on main and does not run UVM', () => {
    const yml = read('.github/workflows/enforce-version-compliance.yml');
    expect(yml).toContain('branches: [main]');
    expect(yml).not.toContain('master');
    expect(yml).not.toContain('universal-version-manager');
    expect(yml).toContain('release:docs-check');
    expect(yml).toContain('foundry-mill.test.ts');
  });

  it('UVM file is gone', () => {
    expect(existsSync(path.join(root, 'scripts/node/universal-version-manager.js'))).toBe(false);
  });

  it('mill is extracted as private @0xray/foundry', () => {
    const mill = JSON.parse(read('scripts/foundry/package.json')) as {
      name: string;
      private: boolean;
    };
    expect(mill.name).toBe('@0xray/foundry');
    expect(mill.private).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/release.mjs'))).toBe(true);
    expect(read('scripts/foundry/release.mjs')).toContain('--publish-only');
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

describe('foundry mill — mint from consumer SSOT', () => {
  it('writes inventory and fills AGENTS placeholders from their package.json', () => {
    const { mintConsumerFromSsot, deployManagedAgents } = requireCjs(
      path.join(root, 'scripts/node/postinstall.cjs'),
    ) as {
      mintConsumerFromSsot: (pkg: string, target: string, log: (...a: unknown[]) => void) => {
        consumer: { name: string; version: string };
      };
      deployManagedAgents: (pkg: string, target: string, log: (...a: unknown[]) => void) => void;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-mint-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '2.3.4' }, null, 2)}\n`,
      );
      const noop = () => undefined;
      const inventory = mintConsumerFromSsot(root, tmp, noop);
      expect(inventory.consumer.name).toBe('acme-app');
      expect(inventory.garment).toBe('copied-onto-hanger');
      const receipt = JSON.parse(readFileSync(path.join(tmp, '.xray/foundry-inventory.json'), 'utf8')) as {
        consumer: { name: string; version: string };
      };
      expect(receipt.consumer).toEqual({ name: 'acme-app', version: '2.3.4' });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      deployManagedAgents(root, tmp, noop);
      const agents = readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('**acme-app**');
      expect(agents).toContain('(2.3.4)');
      expect(agents).not.toContain('{{CONSUMER_NAME}}');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
