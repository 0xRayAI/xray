/**
 * Grok CLI Integration for 0xRay
 *
 * This module provides the integration points for using 0xRay with the official Grok CLI.
 *
 * Primary mechanism: MCP (Model Context Protocol)
 * Grok CLI can consume MCP servers. By registering the 0xRay MCP servers,
 * users get access to Governance, skills, and other capabilities directly inside Grok conversations.
 *
 * Recommended registration (via npx or Grok's tooling):
 *   npx 0xray grok install
 *
 * This will help configure the user's Grok CLI to include the following MCP servers:
 * - governance (Dynamo Solar SSOT + real skill deliberation)
 * - All knowledge-skill MCP servers (code-review, security-audit, researcher, etc.)
 */

import { frameworkLogger, type LogStatus } from '../../core/framework-logger.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';
import { syncBuiltinSkills } from '../../cli/commands/skill-install.js';
import { mintAfterWear } from '../../cli/commands/foundry-mint-wear.js';

// ESM-compatible __dirname (this file is compiled to ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..', '..', '..');
const requireCjs = createRequire(import.meta.url);
const { resolveConsumerTargetDir, patchGrokHooks } = requireCjs(
  path.join(packageRoot, 'scripts/node/install-bridges.cjs')
) as {
  resolveConsumerTargetDir: (packageRoot: string, cwd: string) => string;
  patchGrokHooks: (
    pluginDir: string,
    packageRoot: string,
    targetDir: string,
    log: (label: string, action: string, status: string, details?: unknown) => void,
    label: string,
  ) => void;
};
const { resolveRepertoireMcp, resolveGogglesMcp } = requireCjs(
  path.join(packageRoot, 'scripts/node/bridge-mcp-wiring.cjs')
) as {
  resolveRepertoireMcp: (targetDir: string) => string | null;
  resolveGogglesMcp: (targetDir: string) => string | null;
};

function registerGrokMcpServers(targetDir: string, env: NodeJS.ProcessEnv): void {
  const wiring = requireCjs(path.join(packageRoot, 'scripts/node/bridge-mcp-wiring.cjs')) as {
    writeProjectSuitMcp: (dir: string) => string;
    trustGrokFolder: (dir: string, env?: NodeJS.ProcessEnv) => string;
  };
  const tomlPath = wiring.writeProjectSuitMcp(targetDir);
  const trustPath = wiring.trustGrokFolder(targetDir, env);
  process.stdout.write(`Project Grok MCP written to ${tomlPath}\n`);
  process.stdout.write(`Grok folder trust written to ${trustPath}\n`);
}

export interface GrokInstallOptions {
  force?: boolean;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  machineHome?: string;
  targetDir?: string;
}

export async function installForGrokCLI(options: GrokInstallOptions = {}): Promise<void> {
  frameworkLogger.log('grok-integration', 'install-start', 'info', {
    options: { force: options.force, dryRun: options.dryRun },
  });

  const millSuit = requireCjs(path.join(packageRoot, 'scripts/foundry/mint-suit.cjs')) as {
    machineHome: () => string;
    processHome: (env?: NodeJS.ProcessEnv) => string;
    isIsolatedHome: (env?: NodeJS.ProcessEnv, machine?: string) => boolean;
    wantsCostume: (targetDir: string) => boolean;
    wouldClobberMachineGrok: (dest: string, env?: NodeJS.ProcessEnv, machine?: string) => boolean;
    resolveGrokPluginDests: (targetDir: string, env?: NodeJS.ProcessEnv, machine?: string) => string[];
  };
  const env = options.env || process.env;
  const machine = options.machineHome || millSuit.machineHome();
  const targetDir = options.targetDir || resolveConsumerTargetDir(packageRoot, process.cwd());
  const dests = millSuit.resolveGrokPluginDests(targetDir, env, machine);
  for (const dest of dests) {
    if (millSuit.wouldClobberMachineGrok(dest, env, machine)) {
      frameworkLogger.log('grok-integration', 'refuse-machine-grok-clobber', 'error', {
        home: millSuit.processHome(env),
        machineHome: machine,
        dest,
      });
      throw new Error('foundry-inspect: isolated HOME must not clobber ~/.grok/plugins/0xray');
    }
  }

  // Try to find the plugin source from the installed package
  const possibleSources = [
    path.join(__dirname, '..', '..', '..', 'src/integrations/grok/plugin/0xray'), // dev
    path.join(__dirname, '..', '..', '..', '.grok/plugins/0xray'), // after build
  ];

  let sourceDir = possibleSources.find(p => fs.existsSync(p));

  if (!sourceDir) {
    console.error('[Grok] Could not locate the 0xray Grok plugin inside the package.');
    return;
  }

  if (options.dryRun) {
    console.log(`[Grok] Dry run: Would copy plugin from ${sourceDir} → ${dests.join(' , ')}`);
    return;
  }

  const isolated = millSuit.isIsolatedHome(env, machine);

  try {
    for (const dest of dests) {
      const pluginExists = fs.existsSync(dest);
      if (pluginExists && !options.force) {
        console.log(`[Grok] 0xray Grok plugin is already installed at ${dest}.`);
        console.log('Use --force to reinstall plugin files.');
      } else {
        fs.cpSync(sourceDir, dest, { recursive: true, force: true });
        frameworkLogger.log('grok-integration', 'plugin-copied', 'info', { destination: dest });
        console.log(`\x1b[32m✓ Copied Grok plugin to ${dest}\x1b[0m`);
      }

      if (millSuit.wantsCostume(targetDir)) {
        const skillsCopied = syncBuiltinSkills(path.join(dest, 'skills'));
        if (skillsCopied > 0) {
          console.log(`\x1b[32m✓ Synced ${skillsCopied} builtin skills to Grok plugin\x1b[0m`);
        }
        frameworkLogger.log('grok-integration', 'skills-synced', 'info', { count: skillsCopied });
      }

      pinGrokPluginToInstalledDist(dest, packageRoot, targetDir);
      wearGrokHookCommands(dest, packageRoot, targetDir);
    }

    if (isolated && millSuit.wantsCostume(targetDir)) {
      const home = millSuit.processHome(env);
      const globalCopied = syncBuiltinSkills(path.join(home, '.grok', 'skills'));
      if (globalCopied > 0) {
        console.log(`\x1b[32m✓ Synced ${globalCopied} builtin skills to isolated ~/.grok/skills/\x1b[0m`);
      }
    }

    writeProjectRepertoireMcp(targetDir);
    writeProjectGogglesMcp(targetDir);
    mintAfterWear(targetDir);

    registerGrokMcpServers(targetDir, env);
    if (!isolated) {
      process.stdout.write('Project-scoped Grok plugin worn (machine ~/.grok/plugins/0xray not written)\n');
    }

    console.log('\n✅ 0xRay is now installed as a first-class Grok CLI plugin!');
    console.log('Restart Grok or run `grok` to load the new hooks and MCP servers.');

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    frameworkLogger.log('grok-integration', 'install-error', 'error', { error: message });
    console.error('Failed to install Grok plugin:', message);
  }

  frameworkLogger.log('grok-integration', 'install-complete', 'info', {});
}

function wearGrokHookCommands(pluginDir: string, xrayRoot: string, targetDir: string): void {
  patchGrokHooks(
    pluginDir,
    xrayRoot,
    targetDir,
    (label, action, status, details) => {
      const level: LogStatus =
        status === 'success' ||
        status === 'error' ||
        status === 'info' ||
        status === 'debug' ||
        status === 'warning'
          ? status
          : 'info';
      frameworkLogger.log(label, action, level, details ?? {});
    },
    'grok-install',
  );
}

function pinGrokPluginToInstalledDist(pluginDir: string, xrayRoot: string, targetDir: string): void {
  const hookJs = path.join(xrayRoot, 'dist/integrations/grok/hooks/pre-tool-use.js');
  const cliJs = path.join(xrayRoot, 'dist/cli/index.js');

  const hooksPath = path.join(pluginDir, 'hooks', 'hooks.json');
  if (fs.existsSync(hookJs) && fs.existsSync(hooksPath)) {
    const text = fs.readFileSync(hooksPath, 'utf8');
    fs.writeFileSync(
      hooksPath,
      text.split('${XRAY_AI_PATH:-node_modules/0xray}').join(xrayRoot),
    );
  }

  const mcpPath = path.join(pluginDir, '.mcp.json');
  if (!fs.existsSync(mcpPath)) return;

  const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8')) as {
    mcpServers?: Record<string, { command?: string; args?: string[]; env?: Record<string, string> }>;
  };
  for (const server of Object.values(mcp.mcpServers ?? {})) {
    server.env = { ...server.env, XRAY_ROOT: targetDir };
    if (
      fs.existsSync(cliJs) &&
      server.command === 'npx' &&
      Array.isArray(server.args) &&
      server.args.includes('mcp')
    ) {
      const mcpIdx = server.args.indexOf('mcp');
      const mcpCmd = server.args[mcpIdx + 1] ?? 'governance';
      server.command = 'node';
      server.args = [cliJs, 'mcp', mcpCmd];
    }
  }
  const repertoireMcp = resolveRepertoireMcp(targetDir);
  const gogglesMcp = resolveGogglesMcp(targetDir);
  if (mcp.mcpServers) {
    if (repertoireMcp) {
      mcp.mcpServers.repertoire = {
        command: 'node',
        args: [repertoireMcp],
      };
    } else {
      delete mcp.mcpServers.repertoire;
    }
    if (gogglesMcp) {
      mcp.mcpServers.goggles = {
        command: 'node',
        args: [gogglesMcp],
        env: { GOGGLES_ROOT: targetDir, GOGGLES_PLANES_PATH: '' },
      };
    } else {
      delete mcp.mcpServers.goggles;
    }
  }
  fs.writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`);
}

/** Grok TUI reads <project>/.grok/config.toml, not the package copy. */
export function writeProjectRepertoireMcp(projectRoot: string): string | null {
  const repertoireMcp = resolveRepertoireMcp(projectRoot);
  if (!repertoireMcp) return null;
  const grokDir = path.join(projectRoot, '.grok');
  fs.mkdirSync(grokDir, { recursive: true });
  const tomlPath = path.join(grokDir, 'config.toml');
  const block = `[mcp_servers.repertoire]
command = "node"
args = [${JSON.stringify(repertoireMcp)}]
enabled = true
`;
  let existing = '';
  if (fs.existsSync(tomlPath)) {
    existing = fs.readFileSync(tomlPath, 'utf8');
  }
  if (/\[mcp_servers\.repertoire\]/.test(existing)) {
    existing = existing.replace(
      /\[mcp_servers\.repertoire\][\s\S]*?(?=\n\[|$)/,
      block.trim(),
    );
    fs.writeFileSync(tomlPath, existing.endsWith('\n') ? existing : `${existing}\n`);
  } else {
    const prefix = existing.trim() ? `${existing.trim()}\n\n` : '';
    fs.writeFileSync(tomlPath, `${prefix}${block}`);
  }
  return tomlPath;
}

/** Grok TUI reads <project>/.grok/config.toml. The launcher fills GOGGLES_ROOT from cwd. */
export function writeProjectGogglesMcp(projectRoot: string): string | null {
  const gogglesMcp = resolveGogglesMcp(projectRoot);
  if (!gogglesMcp) return null;
  const grokDir = path.join(projectRoot, '.grok');
  fs.mkdirSync(grokDir, { recursive: true });
  const tomlPath = path.join(grokDir, 'config.toml');
  const block = `[mcp_servers.goggles]
command = "node"
args = [${JSON.stringify(gogglesMcp)}]
enabled = true
`;
  let existing = '';
  if (fs.existsSync(tomlPath)) {
    existing = fs.readFileSync(tomlPath, 'utf8');
  }
  if (/\[mcp_servers\.goggles\]/.test(existing)) {
    existing = existing.replace(
      /\[mcp_servers\.goggles\][\s\S]*?(?=\n\[|$)/,
      block.trim(),
    );
    fs.writeFileSync(tomlPath, existing.endsWith('\n') ? existing : `${existing}\n`);
  } else {
    const prefix = existing.trim() ? `${existing.trim()}\n\n` : '';
    fs.writeFileSync(tomlPath, `${prefix}${block}`);
  }
  return tomlPath;
}

export default {
  installForGrokCLI,
  writeProjectRepertoireMcp,
  writeProjectGogglesMcp,
};
