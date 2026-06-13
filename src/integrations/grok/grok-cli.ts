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

// ESM-compatible __dirname (this file is compiled to ESM)
const __dirname = path.dirname(new URL(import.meta.url).pathname);

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
    frameworkLogger.log('grok-cli', 'Could not locate the 0xray Grok plugin inside the package.', 'error', {});
    return;
  }

  if (options.dryRun) {
    frameworkLogger.log('grok-cli', `Dry run: Would copy plugin from ${sourceDir} → ${targetPluginDir}`, 'info', {});
    return;
  }

  try {
    if (fs.existsSync(targetPluginDir) && !options.force) {
      frameworkLogger.log('grok-cli', '0xray Grok plugin is already installed.', 'info', {});
      frameworkLogger.log('grok-cli', 'Use --force to reinstall.', 'info', {});
      return;
    }

    fs.cpSync(sourceDir, targetPluginDir, { recursive: true, force: true });
    frameworkLogger.log('grok-integration', 'plugin-copied', 'info', { destination: targetPluginDir });

    frameworkLogger.log('grok-cli', `Copied Grok plugin to ${targetPluginDir}`, 'info', {});

    // Attempt auto-trust (best effort)
    try {
      execSync(`grok plugins trust "${targetPluginDir}"`, { stdio: 'ignore' });
      frameworkLogger.log('grok-cli', 'Auto-trusted the 0xray plugin with Grok CLI', 'info', {});
    } catch {
      frameworkLogger.log('grok-cli', 'Please run this command to fully trust the plugin:', 'info', {});
      frameworkLogger.log('grok-cli', `  grok plugins trust "${targetPluginDir}"`, 'info', {});
    }

    // Register MCP servers via grok mcp add (most reliable mechanism)
    const xrayRoot = path.resolve(__dirname, '..', '..', '..');
    const govMcpPath = path.join(xrayRoot, 'dist/mcps/governance.server.js');
    const skillsMcpPath = path.join(xrayRoot, 'dist/mcps/knowledge-skills/skill-invocation.server.js');
    const enforcerMcpPath = path.join(xrayRoot, 'dist/mcps/enforcer-tools.server.js');
    const orchestratorMcpPath = path.join(xrayRoot, 'dist/mcps/orchestrator/server.js');
    const mcpServers = [
      { name: 'xray-governance', path: govMcpPath },
      { name: 'xray-skills', path: skillsMcpPath },
      { name: 'xray-enforcer', path: enforcerMcpPath },
      { name: 'xray-orchestrator', path: orchestratorMcpPath },
    ];
    try {
      for (const server of mcpServers) {
        execSync(
          `grok mcp add ${server.name} --command node --args "${server.path}" --env "XRAY_ROOT=${xrayRoot}"`,
          { stdio: 'pipe' }
        );
      }
      frameworkLogger.log('grok-cli', 'Registered xray MCP servers with Grok CLI', 'info', {});
    } catch {
      frameworkLogger.log('grok-cli', 'Could not auto-register MCP servers. Run manually:', 'info', {});
      for (const server of mcpServers) {
        frameworkLogger.log('grok-cli', `  grok mcp add ${server.name} --command node --args "${server.path}"`, 'info', {});
      }
    }

    frameworkLogger.log('grok-cli', '0xRay is now installed as a first-class Grok CLI plugin!', 'info', {});
    frameworkLogger.log('grok-cli', 'Restart Grok or run `grok` to load the new hooks and MCP servers.', 'info', {});

  } catch (err: any) {
    frameworkLogger.log('grok-integration', 'install-error', 'error', { error: err.message });
    frameworkLogger.log('grok-cli', 'Failed to install Grok plugin:', 'error', { error: err.message });
  }

  frameworkLogger.log('grok-integration', 'install-complete', 'info', {});
}

export default {
  installForGrokCLI,
};
