import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const cli = path.join(root, 'dist/cli/index.js');

const TOP_LEVEL = [
  'install',
  'setup',
  'look',
  'goggles',
  'wear',
  'unwear',
  'init',
  'status',
  'validate',
  'debug',
  'capabilities',
  'caps',
  'health',
  'check',
  'report',
  'fix',
  'analytics',
  'doctor',
  'archive-logs',
  'inference:improve',
  'inference:tuner',
  'inference:run',
  'publish-agent',
  'antigravity',
  'credible',
  'skill:registry',
  'skill:install',
  'storyteller',
  'mcp-list',
  'mcp:list',
  'mcp-status',
  'mcp:status',
  'mcp-install',
  'mcp:install',
  'mcp-remove',
  'mcp:remove',
  'mcp',
  'grok',
  'hermes',
  'openclaw',
  'opencode',
  'plugin',
] as const;

const HELP_LINES = [
  'Install xray framework in the current project',
  'Set up .mcp.json and the OpenCode, Grok, Hermes, and OpenClaw bridges',
  'Kind 0 is quiet on a match. One outer is a reading. digest and triage return a card.',
  'Same organ as look.',
  'Wear the 0xray suit in this git checkout',
  'Remove the 0xray suit and restore the pre-wear hooks file',
  'Initialize xray configuration in the current project',
  'Show comprehensive xray framework status',
  'Validate consumer wear (pack paths, Cursor hooks, mill plant) — not leftover init.sh',
  'Show all available xray framework capabilities',
  'Check framework health and system status',
  'Generate framework activity and health reports',
  'Automatically fix common framework issues by running the postinstall setup',
  'Pattern analysis from recent task completions',
  'Diagnose framework issues (does not fix them)',
  'Archive log files without framework boot (for git hooks)',
  'Run autonomous inference improvement cycle',
  'Start/stop the autonomous inference tuner service',
  'Run a self-improvement inference cycle: collect → propose → govern → verify',
  'Package and publish agents to AgentStore',
  'Show status of all installed skills',
  'Initialize Credible Pod infrastructure',
  'List, add, or remove skills registry sources',
  'Install skills from the registry or any git repo',
  'Write reflections, sagas, journeys, or narratives',
  'List available community MCP servers',
  'Show installed MCP servers',
  'Install an MCP server from the registry',
  'Remove an installed MCP server',
  'Run an MCP server subprocess (used by Grok/OpenCode .mcp.json)',
  'Grok CLI integration commands',
  'Hermes Agent integration commands',
  'OpenClaw integration commands',
  'OpenCode integration commands',
  'Manage plugins',
] as const;

function requireCli(): void {
  if (!existsSync(cli)) {
    throw new Error('dist/cli/index.js missing — run npm run build');
  }
}

function run(args: string[]) {
  requireCli();
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    timeout: 20000,
  });
}

function flat(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function staticSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const pattern = /^import\s[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/gm;
  for (const match of source.matchAll(pattern)) {
    const spec = match[1];
    if (spec) specs.push(spec);
  }
  return specs;
}

function hasDynamicImport(source: string, spec: string): boolean {
  return source.includes(`import("${spec}")`) || source.includes(`import('${spec}')`);
}

describe('0xray command names', () => {
  it('keeps command names and descriptions on --help', () => {
    const result = run(['--help']);
    const combined = flat(`${result.stdout}${result.stderr}`);
    expect(result.status, result.stderr).toBe(0);
    for (const name of TOP_LEVEL) {
      expect(combined, name).toContain(name);
    }
    for (const line of HELP_LINES) {
      expect(combined, line).toContain(line);
    }
  });

  it('keeps host and plugin subcommand names', () => {
    const cases: Array<{ args: string[]; needles: string[] }> = [
      {
        args: ['grok', '--help'],
        needles: [
          'install',
          'Install 0xRay as a first-class Grok CLI plugin (hooks + MCP servers)',
        ],
      },
      {
        args: ['grok', 'install', '--help'],
        needles: ['--dry-run', '--force', 'Show what would be done without making changes', 'Force reinstall even if already present'],
      },
      {
        args: ['hermes', '--help'],
        needles: [
          'install',
          'Install 0xRay as a Hermes Agent plugin (hooks + MCP servers)',
        ],
      },
      {
        args: ['hermes', 'install', '--help'],
        needles: ['--dry-run', '--force'],
      },
      {
        args: ['openclaw', '--help'],
        needles: [
          'install',
          'Install 0xRay OpenClaw integration (config + API server setup)',
        ],
      },
      {
        args: ['openclaw', 'install', '--help'],
        needles: ['--dry-run', '--force'],
      },
      {
        args: ['opencode', '--help'],
        needles: [
          'install',
          'Install 0xRay OpenCode plugin (agents, skills, hooks, config)',
        ],
      },
      {
        args: ['opencode', 'install', '--help'],
        needles: ['--dry-run', '--force'],
      },
      {
        args: ['plugin', '--help'],
        needles: [
          'list',
          'install',
          'enable',
          'disable',
          'status',
          'uninstall',
          'List installed plugins',
          'Install a plugin',
          'Enable a plugin',
          'Disable a plugin',
          'Show plugin details',
          'Uninstall a plugin',
        ],
      },
    ];
    for (const item of cases) {
      const result = run(item.args);
      const combined = flat(`${result.stdout}${result.stderr}`);
      expect(result.status, result.stderr).toBe(0);
      for (const needle of item.needles) {
        expect(combined, `${item.args.join(' ')} :: ${needle}`).toContain(needle);
      }
    }
  });

  it('loads the logger, inference gate, and host installers only when needed', () => {
    const entry = readFileSync(cli, 'utf8');
    const specs = staticSpecifiers(entry);
    expect(specs).not.toContain('../core/framework-logger.js');
    expect(specs).not.toContain('../inference/inference-run-gate.js');
    expect(specs).not.toContain('../core/config-paths.js');
    expect(hasDynamicImport(entry, '../core/framework-logger.js')).toBe(true);
    expect(hasDynamicImport(entry, '../inference/inference-run-gate.js')).toBe(true);
    expect(hasDynamicImport(entry, '../core/config-paths.js')).toBe(true);

    const grok = readFileSync(path.join(root, 'dist/cli/commands/grok-install.js'), 'utf8');
    expect(staticSpecifiers(grok)).not.toContain('../../integrations/grok/grok-cli.js');
    expect(hasDynamicImport(grok, '../../integrations/grok/grok-cli.js')).toBe(true);

    for (const file of ['hermes-install.js', 'openclaw-install.js', 'opencode-install.js']) {
      const text = readFileSync(path.join(root, 'dist/cli/commands', file), 'utf8');
      const imported = staticSpecifiers(text);
      expect(imported, file).not.toContain('../../core/framework-logger.js');
      expect(imported, file).not.toContain('./skill-install.js');
      expect(imported, file).not.toContain('./foundry-mint-wear.js');
      expect(hasDynamicImport(text, '../../core/framework-logger.js'), file).toBe(true);
      expect(hasDynamicImport(text, './skill-install.js'), file).toBe(true);
      expect(hasDynamicImport(text, './foundry-mint-wear.js'), file).toBe(true);
    }

    const openclaw = readFileSync(path.join(root, 'dist/cli/commands/openclaw-install.js'), 'utf8');
    expect(staticSpecifiers(openclaw)).not.toContain('../../integrations/openclaw/config.js');
    expect(staticSpecifiers(openclaw)).not.toContain('../../nucleus/suit-temperament.js');
    expect(hasDynamicImport(openclaw, '../../integrations/openclaw/config.js')).toBe(true);
    expect(hasDynamicImport(openclaw, '../../nucleus/suit-temperament.js')).toBe(true);
  });
});
