/**
 * xray govern — the primary CLI command for the v3 nucleus
 *
 * Usage:
 *   xray govern [options]
 *
 * All existing direct commands still work (backward compat with deprecation notice).
 */

import { resolve, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';

interface GovernOptions {
  status?: boolean;
  audit?: boolean;
  mcp?: string;
  pluginInstall?: string;
  proposals?: string;
  skillInstall?: string;
  skillRegistry?: string;
  storyteller?: string;
  mcpList?: boolean;
  mcpStatus?: boolean;
  mcpInstall?: string;
  mcpRemove?: string;
  publishAgent?: boolean;
  archiveLogs?: boolean;
  credibleInit?: string;
  antigravityStatus?: boolean;
  [key: string]: unknown;
}

export async function governCommand(options: GovernOptions): Promise<void> {
  if (options.status) {
    const { statusCommand } = await import('./status.js');
    await statusCommand();
    return;
  }

  if (options.audit) {
    const { securityAuditCommand } = await import('./security-audit.js');
    await securityAuditCommand();
    return;
  }

  if (options.mcp) {
    const serverMap: Record<string, string> = {
      governance: 'dist/mcps/governance.server.js',
      skills: 'dist/mcps/knowledge-skills/skill-invocation.server.js',
    };
    const relPath = serverMap[options.mcp];
    if (!relPath) {
      console.error(`Unknown MCP server: ${options.mcp}. Use: governance, skills`);
      process.exit(1);
    }
    const packageJsonPath = resolve(import.meta.url.replace(/^file:/, ''), '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const packageRoot = resolve(packageJsonPath, '..', pkg.xray?.dist ? join('', pkg.xray.dist) : 'dist', '..');
    const serverPath = resolve(join(packageRoot, relPath));
    if (!existsSync(serverPath)) {
      console.error(`MCP server not found at ${serverPath}. Is xray installed correctly?`);
      process.exit(1);
    }
    const env: Record<string, string> = { ...process.env as Record<string, string> };
    const child = spawn(process.execPath, [serverPath], { stdio: 'inherit', env });
    child.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  if (options.pluginInstall) {
    const { pluginInstallCommand } = await import('./plugin-commands.js');
    await pluginInstallCommand(options.pluginInstall);
    return;
  }

  if (options.proposals) {
    const { handleGovernRequest } = await import('../../nucleus/index.js');
    let proposals;
    try {
      proposals = JSON.parse(options.proposals);
    } catch {
      console.error('Invalid JSON in --proposals. Expected a JSON string with a "proposals" array.');
      console.error('Example: xray govern --proposals \'[{"type":"fix","title":"Test","description":"A test"}]\'');
      process.exit(1);
    }
    const result = await handleGovernRequest(proposals);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (options.skillInstall !== undefined) {
    const { skillInstallCommand } = await import('./skill-install.js');
    await skillInstallCommand(options.skillInstall || undefined);
    return;
  }

  if (options.skillRegistry !== undefined) {
    const { skillRegistryCommand } = await import('./skill-install.js');
    await skillRegistryCommand(options.skillRegistry || undefined);
    return;
  }

  if (options.storyteller) {
    const { storytellerCommand } = await import('./storyteller.js');
    await storytellerCommand(options.storyteller);
    return;
  }

  if (options.mcpList) {
    const { listMCPsCommand } = await import('./mcp-install.js');
    listMCPsCommand();
    return;
  }

  if (options.mcpStatus) {
    const { showMCPStatusCommand } = await import('./mcp-install.js');
    showMCPStatusCommand();
    return;
  }

  if (options.mcpInstall) {
    const { installMCPCommand } = await import('./mcp-install.js');
    await installMCPCommand(options.mcpInstall);
    return;
  }

  if (options.mcpRemove) {
    const { removeMCPCommand } = await import('./mcp-install.js');
    removeMCPCommand(options.mcpRemove);
    return;
  }

  if (options.publishAgent) {
    const { publishAgentCommand } = await import('./publish-agent.js');
    await publishAgentCommand();
    return;
  }

  if (options.archiveLogs) {
    const { archiveLogFiles } = await import('./archive-logs.js');
    const result = await archiveLogFiles(undefined, `govern-${Date.now()}`);
    console.log(`\nResults:`);
    console.log(`  Archived: ${result.archived} files`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach((e: string) => console.log(`    - ${e}`));
      process.exit(1);
    }
    return;
  }

  if (options.credibleInit !== undefined) {
    const { credibleInitCommand } = await import('./credible-init.js');
    await credibleInitCommand();
    return;
  }

  if (options.antigravityStatus) {
    const { antigravityStatusCommand } = await import('./antigravity-status.js');
    await antigravityStatusCommand();
    return;
  }

  console.log('xray govern — the governance kernel\n');
  console.log('Usage: xray govern [options]\n');
  console.log('Options:');
  console.log('  --status                   Show framework status');
  console.log('  --audit                    Run security audit');
  console.log('  --mcp <server>             Run an MCP server (governance, skills)');
  console.log('  --plugin-install <name>    Install a plugin');
  console.log('  --proposals <json>         Run governance on JSON proposals');
  console.log('  --skill-install [source]   Install skills from registry');
  console.log('  --skill-registry [action]   Manage skill registry sources');
  console.log('  --storyteller <type>       Write a story (reflection, saga, journey, narrative)');
  console.log('  --mcp-list                 List available MCP servers');
  console.log('  --mcp-status               Show installed MCP servers');
  console.log('  --mcp-install <name>       Install an MCP server');
  console.log('  --mcp-remove <name>        Remove an MCP server');
  console.log('  --publish-agent            Publish an agent to AgentStore');
  console.log('  --archive-logs             Archive log files');
  console.log('  --credible-init [name]     Initialize Credible Pod');
  console.log('  --antigravity-status       Show installed skills status');
  console.log('  -h, --help                 Show this help\n');
  console.log('All existing commands still work: xray status, xray security-audit, etc.');
}
