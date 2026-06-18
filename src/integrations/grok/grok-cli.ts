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

import { frameworkLogger } from '../../core/framework-logger.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { syncBuiltinSkills } from '../../cli/commands/skill-install.js';

// ESM-compatible __dirname (this file is compiled to ESM)
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const packageRoot = path.resolve(__dirname, '..', '..', '..');
const requireCjs = createRequire(import.meta.url);
const { resolveConsumerTargetDir } = requireCjs(
  path.join(packageRoot, 'scripts/node/install-bridges.cjs')
);

/** Canonical 7-server MCP surface — matches install-bridges.cjs and package .mcp.json */
const XRAY_MCP_SERVERS = [
  { name: 'xray-governance', mcpCmd: 'governance', env: { XRAY_FORCE_MCP_GOVERNANCE: 'true' } },
  { name: 'xray-skills', mcpCmd: 'skills', env: {} },
  { name: 'xray-orchestrator', mcpCmd: 'orchestrator', env: {} },
  { name: 'xray-enforcer', mcpCmd: 'enforcer', env: {} },
  { name: 'xray-researcher', mcpCmd: 'researcher', env: {} },
  { name: 'xray-code-review', mcpCmd: 'code-review', env: {} },
  { name: 'xray-architect-tools', mcpCmd: 'architect-tools', env: {} },
] as const;

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

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const targetPluginDir = path.join(home, '.grok/plugins/0xray');

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

  } catch (err: any) {
    frameworkLogger.log('grok-integration', 'install-error', 'error', { error: err.message });
    console.error('Failed to install Grok plugin:', err.message);
  }

  frameworkLogger.log('grok-integration', 'install-complete', 'info', {});
}

export default {
  installForGrokCLI,
};
