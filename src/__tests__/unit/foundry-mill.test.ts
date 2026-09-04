import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOUNDRY_EXO_CANNOT_SHIP, executeReleaseWorkflow } from '../../enforcement/enforcer-tools.js';
import { VersionComplianceProcessor } from '../../processors/implementations/version-compliance-processor.js';
import { eraFromVersion, buildDocsHeader } from '../../../scripts/foundry/version-manager.mjs';
import { validateReleaseDocs } from '../../../scripts/foundry/validate-release-docs.mjs';
import { mintAfterWear } from '../../cli/commands/foundry-mint-wear.js';

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
      expect(`${r.stdout}${r.stderr}`).toMatch(/reconcile/);
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

  it('mill is extracted as publishable @0xray/foundry', () => {
    const mill = JSON.parse(read('scripts/foundry/package.json')) as {
      name: string;
      private?: boolean;
      version: string;
      bin?: string | Record<string, string>;
    };
    expect(mill.name).toBe('@0xray/foundry');
    expect(mill.private).not.toBe(true);
    expect(mill.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(read('scripts/foundry/CHANGELOG.md')).toContain(`## [${mill.version}]`);
    expect(mill.bin).toEqual({ '0xray-foundry': 'cli.js' });
    expect(read('scripts/foundry/release.mjs')).toContain('--i-mean-it');
    expect(read('scripts/foundry/cli.mjs')).toContain('FOUNDRY_RELEASE');
    expect(read('scripts/foundry/cli.mjs')).toContain('ci-monitor.mjs');
    expect(read('scripts/foundry/cli.mjs')).toContain('hooks.mjs');
    expect(existsSync(path.join(root, 'scripts/foundry/cli.js'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/cli.mjs'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/README.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/CHANGELOG.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/release.mjs'))).toBe(true);
    expect(read('scripts/foundry/release.mjs')).toContain('--publish-only');
  });

  it('dead wrappers are gone', () => {
    expect(existsSync(path.join(root, 'scripts/node/sync-versions.mjs'))).toBe(false);
    expect(existsSync(path.join(root, 'scripts/node/release.js'))).toBe(false);
  });

  it('mill root is FOUNDRY_ROOT or cwd, not __dirname/../..', () => {
    const src = read('scripts/foundry/mill-root.mjs');
    expect(src).toContain('FOUNDRY_ROOT');
    expect(src).toContain('process.cwd()');
    for (const rel of [
      'version-manager.mjs',
      'validate-release-docs.mjs',
      'reconcile-version.mjs',
      'release.mjs',
      'release-gate.mjs',
    ]) {
      const mill = read(`scripts/foundry/${rel}`);
      expect(mill, rel).not.toMatch(/path\.resolve\(__dirname,\s*['"]\.\.\/\.\.['"]\)/);
    }
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
        garment: string;
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

  it('runPostinstall overlays after bridges, not via a file-wide indexOf', () => {
    const src = read('scripts/node/postinstall.cjs');
    const start = src.indexOf('function runPostinstall');
    const end = src.indexOf('module.exports');
    const body = src.slice(start, end);
    expect(body.indexOf('installAllBridges')).toBeGreaterThan(-1);
    expect(body.indexOf('mintConsumerSuit')).toBeGreaterThan(body.indexOf('installAllBridges'));

    const { runPostinstall } = requireCjs(path.join(root, 'scripts/node/postinstall.cjs')) as {
      runPostinstall: (pkg: string, target: string, log: (...a: unknown[]) => void) => void;
    };
    const mill = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-millpkg-'));
    const consumer = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-consumer-'));
    try {
      writeFileSync(
        path.join(mill, 'package.json'),
        `${JSON.stringify({ name: '0xray', version: '4.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(mill, 'AGENTS-consumer.md'),
        `# Agents\n\n**{{CONSUMER_NAME}}**{{CONSUMER_VERSION_PAREN}}\n\n<!-- 0xray-managed -->\n`,
      );
      mkdirSync(path.join(mill, 'xray'), { recursive: true });
      writeFileSync(
        path.join(mill, 'xray/codex.json'),
        `${JSON.stringify({ terms: { '1': { title: 'mill' } } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(mill, 'xray/features.json'),
        `${JSON.stringify({ version: '4.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(consumer, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '2.3.4' }, null, 2)}\n`,
      );
      mkdirSync(path.join(consumer, 'src/skills/acme-tool'), { recursive: true });
      writeFileSync(path.join(consumer, 'src/skills/acme-tool/SKILL.md'), 'CONSUMER ACME\n');
      mkdirSync(path.join(consumer, 'xray'), { recursive: true });
      writeFileSync(path.join(consumer, 'xray/AGENTS.md'), '# Acme card\n');
      runPostinstall(mill, consumer, () => undefined);
      expect(readFileSync(path.join(consumer, 'AGENTS.md'), 'utf8')).toContain('Acme card');
      expect(readFileSync(path.join(consumer, '.opencode/skills/acme-tool/SKILL.md'), 'utf8')).toBe(
        'CONSUMER ACME\n',
      );
      const receipt = JSON.parse(
        readFileSync(path.join(consumer, '.xray/foundry-inventory.json'), 'utf8'),
      ) as { garment: string; facets: { agentsCard: boolean } };
      expect(receipt.garment).toBe('overlay');
      expect(receipt.facets.agentsCard).toBe(true);
    } finally {
      rmSync(mill, { recursive: true, force: true });
      rmSync(consumer, { recursive: true, force: true });
    }
  });

  it('overlays skills, agents, and constitution onto the hanger', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => {
        garment: string;
        facets: { constitution: boolean; skills: string[]; agents: string[] };
      };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-overlay-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '2.3.4' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'src/skills/acme-tool'), { recursive: true });
      mkdirSync(path.join(tmp, 'src/skills/enforcer'), { recursive: true });
      mkdirSync(path.join(tmp, 'src/skills/nope'), { recursive: true });
      mkdirSync(path.join(tmp, 'src/opencode/agents'), { recursive: true });
      mkdirSync(path.join(tmp, '.opencode/skills/enforcer'), { recursive: true });
      mkdirSync(path.join(tmp, '.opencode/agents'), { recursive: true });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      mkdirSync(path.join(tmp, 'xray'), { recursive: true });
      writeFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'MILL GARMENT\n');
      writeFileSync(path.join(tmp, '.opencode/agents/orchestrator.yml'), 'name: mill-orchestrator\n');
      writeFileSync(path.join(tmp, 'src/skills/acme-tool/SKILL.md'), 'CONSUMER ACME\n');
      writeFileSync(path.join(tmp, 'src/skills/enforcer/SKILL.md'), 'CONSUMER ENFORCER\n');
      writeFileSync(path.join(tmp, 'src/skills/nope/index.ts'), 'export {}\n');
      writeFileSync(path.join(tmp, 'src/opencode/agents/acme.yml'), 'name: acme\n');
      writeFileSync(
        path.join(tmp, '.xray/codex.json'),
        `${JSON.stringify({ terms: { '1': { title: 'mill-term' }, '11': { title: 'keep' } } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'xray/codex.json'),
        `${JSON.stringify({ terms: { '1': { title: 'acme-constitution' } } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'strict' } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, '.xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'guided' }, token_optimization: { enabled: true } }, null, 2)}\n`,
      );

      const inventory = mintConsumerSuit(root, tmp, () => undefined);
      expect(inventory.garment).toBe('overlay');
      expect(inventory.facets.constitution).toBe(true);
      expect(inventory.facets.skills).toEqual(expect.arrayContaining(['acme-tool', 'enforcer']));
      expect(inventory.facets.skills).not.toContain('nope');
      expect(readFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'utf8')).toBe(
        'CONSUMER ENFORCER\n',
      );
      expect(readFileSync(path.join(tmp, '.opencode/agents/acme.yml'), 'utf8')).toBe('name: acme\n');
      expect(readFileSync(path.join(tmp, '.opencode/agents/orchestrator.yml'), 'utf8')).toBe(
        'name: mill-orchestrator\n',
      );
      const codex = JSON.parse(readFileSync(path.join(tmp, '.xray/codex.json'), 'utf8')) as {
        terms: Record<string, { title: string }>;
      };
      expect(codex.terms['1'].title).toBe('acme-constitution');
      expect(codex.terms['11'].title).toBe('keep');
      const features = JSON.parse(readFileSync(path.join(tmp, '.xray/features.json'), 'utf8')) as {
        suit_temperament: { profile: string };
        token_optimization: { enabled: boolean };
      };
      expect(features.suit_temperament.profile).toBe('strict');
      expect(features.token_optimization.enabled).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('overlays skills onto worn Grok plugin hangers; file remap does not throw', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => {
        garment: string;
        skipped?: boolean;
      };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-floors-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'src/skills/acme-tool'), { recursive: true });
      mkdirSync(path.join(tmp, '.grok/plugins/0xray/skills/enforcer'), { recursive: true });
      writeFileSync(path.join(tmp, 'src/skills/acme-tool/SKILL.md'), 'CONSUMER ACME\n');
      writeFileSync(path.join(tmp, '.grok/plugins/0xray/skills/enforcer/SKILL.md'), 'MILL GROK\n');
      const inventory = mintConsumerSuit(root, tmp, () => undefined);
      expect(inventory.garment).toBe('overlay');
      expect(readFileSync(path.join(tmp, '.opencode/skills/acme-tool/SKILL.md'), 'utf8')).toBe(
        'CONSUMER ACME\n',
      );
      expect(
        readFileSync(path.join(tmp, '.grok/plugins/0xray/skills/acme-tool/SKILL.md'), 'utf8'),
      ).toBe('CONSUMER ACME\n');
      expect(
        readFileSync(path.join(tmp, '.grok/plugins/0xray/skills/enforcer/SKILL.md'), 'utf8'),
      ).toBe('MILL GROK\n');

      writeFileSync(
        path.join(tmp, 'foundry.json'),
        `${JSON.stringify({ skills: 'xray/codex.json' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'xray'), { recursive: true });
      writeFileSync(path.join(tmp, 'xray/codex.json'), '{ not-a-dir }\n');
      expect(() => mintConsumerSuit(root, tmp, () => undefined)).not.toThrow();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('JSON mill-fill keeps mill keys; invalid plant JSON leaves the hanger', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-modes-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'xray'), { recursive: true });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'guided' }, token_optimization: { enabled: true } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'strict' } }, null, 2)}\n`,
      );
      mintConsumerSuit(root, tmp, () => undefined);
      const features = JSON.parse(readFileSync(path.join(tmp, '.xray/features.json'), 'utf8')) as {
        token_optimization?: { enabled: boolean };
        suit_temperament: { profile: string };
      };
      expect(features.suit_temperament.profile).toBe('strict');
      expect(features.token_optimization?.enabled).toBe(true);

      writeFileSync(path.join(tmp, '.xray/codex.json'), `${JSON.stringify({ terms: { '1': { title: 'keep' } } }, null, 2)}\n`);
      writeFileSync(path.join(tmp, 'xray/codex.json'), 'not-json');
      mintConsumerSuit(root, tmp, () => undefined);
      const codex = JSON.parse(readFileSync(path.join(tmp, '.xray/codex.json'), 'utf8')) as {
        terms: Record<string, { title: string }>;
      };
      expect(codex.terms['1'].title).toBe('keep');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('skips skills overlay when plant path is the hanger', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-same-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, '.opencode/skills/enforcer'), { recursive: true });
      writeFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'MILL GARMENT\n');
      writeFileSync(
        path.join(tmp, 'foundry.json'),
        `${JSON.stringify({ skills: '.opencode/skills' }, null, 2)}\n`,
      );
      mintConsumerSuit(root, tmp, () => undefined);
      expect(readFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'utf8')).toBe(
        'MILL GARMENT\n',
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('mintAfterWear overlays plant skills onto the project hanger', () => {
    expect(read('src/cli/commands/foundry-mint-wear.ts')).toContain('fileURLToPath');
    expect(read('src/cli/commands/opencode-install.ts')).toContain('mintAfterWear');
    expect(read('src/cli/commands/skill-install.ts')).not.toContain('mintAfterWear');
    expect(read('src/cli/commands/hermes-install.ts')).toContain('mintAfterWear');
    expect(read('src/cli/commands/openclaw-install.ts')).toContain('mintAfterWear');
    expect(read('src/integrations/grok/grok-cli.ts')).toContain('mintAfterWear');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-wear-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'src/skills/acme-tool'), { recursive: true });
      mkdirSync(path.join(tmp, '.opencode/skills/enforcer'), { recursive: true });
      writeFileSync(path.join(tmp, 'src/skills/acme-tool/SKILL.md'), 'CONSUMER ACME\n');
      writeFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'MILL GARMENT\n');
      mintAfterWear(tmp);
      expect(readFileSync(path.join(tmp, '.opencode/skills/acme-tool/SKILL.md'), 'utf8')).toBe(
        'CONSUMER ACME\n',
      );
      expect(readFileSync(path.join(tmp, '.opencode/skills/enforcer/SKILL.md'), 'utf8')).toBe(
        'MILL GARMENT\n',
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('skill hangers stay in the milled tree', () => {
    const { listSkillHangers } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      listSkillHangers: (dir: string) => string[];
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-hangers-'));
    try {
      mkdirSync(path.join(tmp, '.grok/plugins/0xray/skills'), { recursive: true });
      const dests = listSkillHangers(tmp);
      expect(dests.every((d) => d.startsWith(tmp))).toBe(true);
      expect(dests.some((d) => d.includes(`${path.sep}.opencode${path.sep}skills`))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('config mill-fill keeps mill keys; invalid plant JSON leaves the hanger', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-config-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'xray'), { recursive: true });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, '.xray/config.json'),
        `${JSON.stringify({ mill: true, keep: true }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'xray/config.json'),
        `${JSON.stringify({ mill: false }, null, 2)}\n`,
      );
      mintConsumerSuit(root, tmp, () => undefined);
      const config = JSON.parse(readFileSync(path.join(tmp, '.xray/config.json'), 'utf8')) as {
        mill: boolean;
        keep?: boolean;
      };
      expect(config.mill).toBe(false);
      expect(config.keep).toBe(true);
      writeFileSync(path.join(tmp, 'xray/config.json'), 'not-json');
      mintConsumerSuit(root, tmp, () => undefined);
      expect(JSON.parse(readFileSync(path.join(tmp, '.xray/config.json'), 'utf8')).keep).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('foundry.json remaps mill SSOT paths and rejects traversal', () => {
    const { mintConsumerSuit, resolveInside } = requireCjs(
      path.join(root, 'scripts/foundry/mint-suit.cjs'),
    ) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => {
        garment: string;
        params: { codex: string };
      };
      resolveInside: (dir: string, rel: string) => string | null;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-params-'));
    try {
      expect(resolveInside(tmp, '../etc/passwd')).toBeNull();
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'suit'), { recursive: true });
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      writeFileSync(
        path.join(tmp, 'foundry.json'),
        `${JSON.stringify({ codex: 'suit/codex.json' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'suit/codex.json'),
        `${JSON.stringify({ terms: { '99': { title: 'only-theirs' } } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, '.xray/codex.json'),
        `${JSON.stringify({ terms: { '1': { title: 'mill' } } }, null, 2)}\n`,
      );
      const inventory = mintConsumerSuit(root, tmp, () => undefined);
      expect(inventory.params.codex).toBe('suit/codex.json');
      const codex = JSON.parse(readFileSync(path.join(tmp, '.xray/codex.json'), 'utf8')) as {
        terms: Record<string, unknown>;
      };
      expect(codex.terms['99']).toBeTruthy();
      expect(codex.terms['1']).toBeTruthy();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('does not write inventory on dogfood', () => {
    const { mintConsumerFromSsot } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerFromSsot: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => { skipped?: boolean; garment: string };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-dogfood-'));
    try {
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'acme-app' }, null, 2)}\n`);
      const result = mintConsumerFromSsot(tmp, tmp, () => undefined);
      expect(result.skipped).toBe(true);
      expect(result.garment).toBe('dogfood');
      expect(existsSync(path.join(tmp, '.xray/foundry-inventory.json'))).toBe(false);
      const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
        mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => {
          skipped?: boolean;
        };
      };
      expect(mintConsumerSuit(tmp, tmp, () => undefined).skipped).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('validate-release-docs is light unless the milled repo is 0xray with docs-site', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-light-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.2.3' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'CHANGELOG.md'), '## [1.2.3] - 2026-09-03\n\n- mill light\n');
      mkdirSync(path.join(tmp, 'docs-site'), { recursive: true });
      const result = validateReleaseDocs(tmp);
      expect(result.mode).toBe('light');
      expect(result.ok, result.errors.join('\n')).toBe(true);
      expect(result.version).toBe('1.2.3');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('stamp creates CHANGELOG when missing; publish mill refuses a nameless package.json', () => {
    expect(read('scripts/foundry/release.mjs')).not.toContain('|| "0xray"');
    expect(read('scripts/foundry/cli.mjs')).toContain('mint');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-stamp-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '9.9.9' }, null, 2)}\n`,
      );
      const r = spawnSync(process.execPath, ['scripts/foundry/version-manager.mjs', '--artifacts-only'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: tmp },
      });
      expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
      expect(existsSync(path.join(tmp, 'CHANGELOG.md'))).toBe(true);
      expect(readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8')).toContain('## [9.9.9]');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    const nameless = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-noname-'));
    try {
      writeFileSync(path.join(nameless, 'package.json'), `${JSON.stringify({ version: '1.0.0' }, null, 2)}\n`);
      const pub = spawnSync(
        process.execPath,
        ['scripts/foundry/release.mjs', '--publish-only', '--dry-run'],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, FOUNDRY_ROOT: nameless },
        },
      );
      expect(pub.status, `${pub.stdout}${pub.stderr}`).not.toBe(0);
      expect(`${pub.stdout}${pub.stderr}`).toMatch(/name is required/);
    } finally {
      rmSync(nameless, { recursive: true, force: true });
    }
  });
});

describe('foundry mill — flesh', () => {
  it('live release is opt-in; dry-run stays free', () => {
    const src = read('scripts/foundry/release.mjs');
    expect(src).toContain('FOUNDRY_RELEASE');
    expect(src).toContain('--i-mean-it');
    expect(src).toMatch(/live = \(publishOnly \|\| Boolean\(releaseType\)\) && !dryRun/);
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-trap-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const env = { ...process.env, FOUNDRY_ROOT: tmp };
      delete env.FOUNDRY_RELEASE;
      const blocked = spawnSync(process.execPath, ['scripts/foundry/release.mjs', 'patch'], {
        cwd: root,
        encoding: 'utf8',
        env,
      });
      expect(blocked.status, `${blocked.stdout}${blocked.stderr}`).not.toBe(0);
      expect(`${blocked.stdout}${blocked.stderr}`).toMatch(/--i-mean-it|FOUNDRY_RELEASE/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('stamp inserts the version after [Unreleased]', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-unreleased-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.2.4' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'CHANGELOG.md'),
        '# Changelog\n\n## [Unreleased]\n\n- pending\n\n## [1.2.3] - 2026-01-01\n\n- old\n',
      );
      const r = spawnSync(process.execPath, ['scripts/foundry/version-manager.mjs', '--artifacts-only'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: tmp },
      });
      expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
      const log = readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8');
      expect(log.indexOf('## [Unreleased]')).toBeGreaterThan(-1);
      expect(log).toContain('- pending');
      expect(log).toContain('## [1.2.4]');
      expect(log.indexOf('## [Unreleased]')).toBeLessThan(log.indexOf('## [1.2.4]'));
      expect(log.indexOf('## [1.2.4]')).toBeLessThan(log.indexOf('## [1.2.3]'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('packed mill tarball mints overlay onto a stranger cwd', () => {
    const packDir = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-pack-'));
    const unpackDir = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-unpack-'));
    const consumer = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-packed-mint-'));
    try {
      const pack = spawnSync('npm', ['pack', '--pack-destination', packDir], {
        cwd: path.join(root, 'scripts/foundry'),
        encoding: 'utf8',
      });
      expect(pack.status, `${pack.stdout}${pack.stderr}`).toBe(0);
      const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
      expect(tgz).toBeTruthy();
      const tar = spawnSync('tar', ['-xzf', path.join(packDir, tgz as string), '-C', unpackDir], {
        encoding: 'utf8',
      });
      expect(tar.status, `${tar.stdout}${tar.stderr}`).toBe(0);
      const millRoot = path.join(unpackDir, 'package');
      expect(existsSync(path.join(millRoot, 'cli.js'))).toBe(true);
      expect(existsSync(path.join(millRoot, 'mint-suit.cjs'))).toBe(true);

      writeFileSync(
        path.join(consumer, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '3.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(consumer, 'xray'), { recursive: true });
      mkdirSync(path.join(consumer, '.xray'), { recursive: true });
      mkdirSync(path.join(consumer, 'src/skills/acme-tool'), { recursive: true });
      mkdirSync(path.join(consumer, '.opencode/skills/enforcer'), { recursive: true });
      writeFileSync(
        path.join(consumer, 'xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'strict' } }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(consumer, '.xray/features.json'),
        `${JSON.stringify({ suit_temperament: { profile: 'guided' }, token_optimization: { enabled: true } }, null, 2)}\n`,
      );
      writeFileSync(path.join(consumer, 'src/skills/acme-tool/SKILL.md'), 'CONSUMER ACME\n');
      writeFileSync(path.join(consumer, '.opencode/skills/enforcer/SKILL.md'), 'MILL GARMENT\n');

      const mint = spawnSync(process.execPath, [path.join(millRoot, 'cli.js'), 'mint'], {
        cwd: consumer,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: consumer },
      });
      expect(mint.status, `${mint.stdout}${mint.stderr}`).toBe(0);
      const features = JSON.parse(readFileSync(path.join(consumer, '.xray/features.json'), 'utf8')) as {
        suit_temperament: { profile: string };
        token_optimization?: { enabled: boolean };
      };
      expect(features.suit_temperament.profile).toBe('strict');
      expect(features.token_optimization?.enabled).toBe(true);
      expect(readFileSync(path.join(consumer, '.opencode/skills/acme-tool/SKILL.md'), 'utf8')).toBe(
        'CONSUMER ACME\n',
      );
      expect(readFileSync(path.join(consumer, '.opencode/skills/enforcer/SKILL.md'), 'utf8')).toBe(
        'MILL GARMENT\n',
      );
      const inventory = JSON.parse(
        readFileSync(path.join(consumer, '.xray/foundry-inventory.json'), 'utf8'),
      ) as { mill: { name: string }; garment: string };
      expect(inventory.mill.name).toBe('@0xray/foundry');
      expect(inventory.garment).toBe('overlay');
    } finally {
      rmSync(packDir, { recursive: true, force: true });
      rmSync(unpackDir, { recursive: true, force: true });
      rmSync(consumer, { recursive: true, force: true });
    }
  });
});

describe('foundry mill — CI and hooks', () => {
  it('GitHub mill CI does not auto-commit reflections or run auto-fix', () => {
    const ci = read('.github/workflows/mill-ci.yml');
    expect(ci).toContain('branches: [main]');
    expect(ci).not.toContain('auto-reflection-generator');
    expect(ci).not.toContain('ci-cd-auto-fix');
    expect(ci).toContain('foundry-mill.test.ts');
    expect(ci).toContain('npm run lint');
    expect(ci).toContain('npm run typecheck');
    const monitor = read('.github/workflows/mill-monitor.yml');
    expect(monitor).toContain('0xRay CI/CD');
    expect(monitor).toContain('ci-monitor.mjs');
    expect(monitor).toContain('Foundry mill (CI report)');
    expect(existsSync(path.join(root, '.github/workflows/ci-cd-monitor.yml'))).toBe(false);
    expect(read('scripts/node/github-actions-monitor.cjs')).toContain('foundry/ci-monitor.mjs');
    expect(read('scripts/node/ci-cd-auto-fix.cjs')).toContain('foundry/ci-monitor.mjs');
    expect(read('.github/workflows/release.yml')).toContain('scripts/foundry/release.mjs');
  });

  it('ci monitor skips honestly without a GitHub token', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-ci-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const env = { ...process.env, FOUNDRY_ROOT: tmp };
      delete env.GITHUB_TOKEN;
      delete env.GH_TOKEN;
      delete env.GITHUB_REPOSITORY;
      const r = spawnSync(process.execPath, ['scripts/foundry/ci-monitor.mjs', '--report'], {
        cwd: root,
        encoding: 'utf8',
        env,
      });
      expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
      expect(`${r.stdout}${r.stderr}`).toMatch(/skipped \(no GitHub token\)/);
      const report = JSON.parse(
        readFileSync(path.join(tmp, '.opencode/logs/ci-cd-monitor-report.json'), 'utf8'),
      ) as { ci_status: string; issues: unknown[] };
      expect(report.ci_status).toBe('unknown');
      expect(report.issues).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry mill — Docusaurus / Pages', () => {
  it('does not clobber the Docusaurus homepage with a static 3.x landing', () => {
    expect(existsSync(path.join(root, 'docs-site/static/index.html'))).toBe(false);
    const pkg = JSON.parse(read('docs-site/package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe('docusaurus build');
    expect(pkg.scripts.build).not.toContain('static/index.html');
    const home = read('docs-site/src/pages/index.tsx');
    expect(home).toContain('useBaseUrl');
    expect(home).toContain('httpEquiv');
    expect(home).not.toContain('from \'@docusaurus/router\'');
    expect(existsSync(path.join(root, 'docs-site/static/.nojekyll'))).toBe(true);
  });

  it('docs-build is mill; stranger mills skip; deploy uses the mill', () => {
    expect(read('scripts/foundry/cli.mjs')).toContain('docs-build.mjs');
    expect(read('.github/workflows/deploy-docs.yml')).toContain('scripts/foundry/docs-build.mjs');
    expect(read('.github/workflows/mill-ci.yml')).toContain('scripts/foundry/docs-build.mjs');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-docs-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, 'docs-site'));
      const r = spawnSync(process.execPath, ['scripts/foundry/docs-build.mjs'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: tmp },
      });
      expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
      expect(`${r.stdout}${r.stderr}`).toMatch(/skipped \(not 0xray exo/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
