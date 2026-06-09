/**
 * xray govern — the primary CLI command for the v3 nucleus
 *
 * Usage:
 *   xray govern                       Run the governance pipeline (interactive)
 *   xray govern --status              Show framework status (alias: xray status)
 *   xray govern --audit               Run security audit (alias: xray security-audit)
 *   xray govern --mcp <server>       Run an MCP server subprocess
 *   xray govern --plugin-install <n>  Install a plugin (alias: xray plugin install)
 *
 * All existing commands still work directly (backward compat).
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
  help?: boolean;
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
    if (options.mcp === 'governance') {
      env.XRAY_FORCE_MCP_GOVERNANCE = 'true';
    }
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

  // Default: show governance status + help
  console.log('xray govern — the governance kernel\n');
  console.log('Usage: xray govern [options]\n');
  console.log('Options:');
  console.log('  --status           Show framework status');
  console.log('  --audit            Run security audit');
  console.log('  --mcp <server>     Run an MCP server (governance, skills)');
  console.log('  --plugin-install   Install a plugin by name');
  console.log('  --proposals <json> Run governance on JSON proposals');
  console.log('  -h, --help         Show this help\n');
  console.log('All existing commands still work: xray status, xray security-audit, etc.');
}