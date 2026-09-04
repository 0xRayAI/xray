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
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { syncBuiltinSkills } from '../../cli/commands/skill-install.js';
import { mintAfterWear } from '../../cli/commands/foundry-mint-wear.js';

// ESM-compatible __dirname (this file is compiled to ESM)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
const { XRAY_MCP_SERVERS, resolveRepertoireMcp } = requireCjs(
  path.join(packageRoot, 'scripts/node/bridge-mcp-wiring.cjs')
) as {
  XRAY_MCP_SERVERS: ReadonlyArray<{
    name: string;
    mcpCmd: string;
    env: Record<string, string>;
  }>;
  resolveRepertoireMcp: (targetDir: string) => string | null;
};

function registerGrokMcpServers(targetDir: string): void {
  try {
    execSync('which grok', { stdio: 'ignore' });
  } catch {
    console.log('[Grok] grok CLI not on PATH — plugin .mcp.json still configured');
    return;
  }

  for (const s of XRAY_MCP_SERVERS) {
    try {
      const envEntries = { ...s.env, XRAY_ROOT: targetDir };
      const envFlags = Object.entries(envEntries)
        .map(([k, v]) => `--env "${k}=${v}"`)
        .join(' ');
      execSync(
        `grok mcp add ${s.name} --command npx --args "-y" "0xray" "mcp" "${s.mcpCmd}" ${envFlags}`,
        { stdio: 'pipe' }
      );
    } catch {
      // already registered or grok config conflict — non-blocking
    }
  }
}

export interface GrokInstallOptions {
  force?: boolean;
  dryRun?: boolean;
}

export async function installForGrokCLI(options: GrokInstallOptions = {}): Promise<void> {
  frameworkLogger.log('grok-integration', 'install-start', 'info', { options });

  const millSuit = requireCjs(path.join(packageRoot, 'scripts/foundry/mint-suit.cjs')) as {
    machineHome: () => string;
    wouldClobberMachineGrok: (dest: string, env?: NodeJS.ProcessEnv, machine?: string) => boolean;
  };
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const machine = millSuit.machineHome();
  const targetPluginDir = path.join(home, '.grok/plugins/0xray');
  if (millSuit.wouldClobberMachineGrok(targetPluginDir, process.env, machine)) {
    frameworkLogger.log('grok-integration', 'refuse-machine-grok-clobber', 'error', {
      home,
      machineHome: machine,
      targetPluginDir,
    });
    throw new Error('foundry-inspect: isolated HOME must not clobber ~/.grok/plugins/0xray');
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
    console.log(`[Grok] Dry run: Would copy plugin from ${sourceDir} → ${targetPluginDir}`);
    return;
  }

  const targetDir = resolveConsumerTargetDir(packageRoot, process.cwd());

  try {
    const pluginExists = fs.existsSync(targetPluginDir);
    if (pluginExists && !options.force) {
      console.log('[Grok] 0xray Grok plugin is already installed.');
      console.log('Use --force to reinstall plugin files.');
    } else {
      fs.cpSync(sourceDir, targetPluginDir, { recursive: true, force: true });
      frameworkLogger.log('grok-integration', 'plugin-copied', 'info', { destination: targetPluginDir });
      console.log(`\x1b[32m✓ Copied Grok plugin to ${targetPluginDir}\x1b[0m`);
    }

    // Sync builtin skills to Grok plugin skills dir
    const grokSkillsDir = path.join(targetPluginDir, 'skills');
    const skillsCopied = syncBuiltinSkills(grokSkillsDir);
    if (skillsCopied > 0) {
      console.log(`\x1b[32m✓ Synced ${skillsCopied} builtin skills to Grok plugin\x1b[0m`);
    }
    frameworkLogger.log('grok-integration', 'skills-synced', 'info', { count: skillsCopied });

    // Grok Build / Cursor also reads ~/.grok/skills/ for agent_skills
    const globalSkillsDir = path.join(home, '.grok', 'skills');
    const globalCopied = syncBuiltinSkills(globalSkillsDir);
    if (globalCopied > 0) {
      console.log(`\x1b[32m✓ Synced ${globalCopied} builtin skills to ~/.grok/skills/\x1b[0m`);
    }

    pinGrokPluginToInstalledDist(targetPluginDir, packageRoot, targetDir);
    wearGrokHookCommands(targetPluginDir, packageRoot, targetDir);

    const projectPluginDir = path.join(targetDir, '.grok', 'plugins', '0xray');
    if (projectPluginDir !== targetPluginDir) {
      if (!fs.existsSync(projectPluginDir) || options.force) {
        fs.cpSync(sourceDir, projectPluginDir, { recursive: true, force: true });
      }
      pinGrokPluginToInstalledDist(projectPluginDir, packageRoot, targetDir);
      wearGrokHookCommands(projectPluginDir, packageRoot, targetDir);
    }

    writeProjectRepertoireMcp(targetDir);
    mintAfterWear(targetDir);

    // Attempt auto-trust (best effort)
    try {
      execSync(`grok plugins trust "${targetPluginDir}"`, { stdio: 'ignore' });
      console.log('\x1b[32m✓ Auto-trusted the 0xray plugin with Grok CLI\x1b[0m');
    } catch {
      console.log('\nPlease run this command to fully trust the plugin:');
      console.log(`  grok plugins trust "${targetPluginDir}"`);
    }

    // Register MCP servers via grok mcp add (npx -y 0xray mcp — matches install-bridges)
    registerGrokMcpServers(targetDir);
    console.log('\x1b[32m✓ Registered 7 xray MCP servers with Grok CLI (npx)\x1b[0m');

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
  if (!fs.existsSync(hookJs)) return;

  const hooksPath = path.join(pluginDir, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    const text = fs.readFileSync(hooksPath, 'utf8');
    fs.writeFileSync(
      hooksPath,
      text.split('${XRAY_AI_PATH:-node_modules/0xray}').join(xrayRoot),
    );
  }

  const mcpPath = path.join(pluginDir, '.mcp.json');
  if (fs.existsSync(mcpPath) && fs.existsSync(cliJs)) {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8')) as {
      mcpServers?: Record<string, { command?: string; args?: string[]; env?: Record<string, string> }>;
    };
    for (const server of Object.values(mcp.mcpServers ?? {})) {
      if (server.command === 'npx' && Array.isArray(server.args) && server.args.includes('mcp')) {
        const mcpIdx = server.args.indexOf('mcp');
        const mcpCmd = server.args[mcpIdx + 1] ?? 'governance';
        server.command = 'node';
        server.args = [cliJs, 'mcp', mcpCmd];
      }
    }
    const repertoireMcp = resolveRepertoireMcp(targetDir);
    if (mcp.mcpServers) {
      if (repertoireMcp) {
        mcp.mcpServers.repertoire = {
          command: 'node',
          args: [repertoireMcp],
        };
      } else {
        delete mcp.mcpServers.repertoire;
      }
    }
    fs.writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`);
  }
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

export default {
  installForGrokCLI,
  writeProjectRepertoireMcp,
};
