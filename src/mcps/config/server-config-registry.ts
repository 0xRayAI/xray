/**
 * Server Configuration Registry
 * 
 * Manages server configurations with support for default servers
 * and runtime configuration registration.
 * 
 * Extracted from mcp-client.ts as part of Phase 2 refactoring.
 */

import { IServerConfig } from '../types/index.js';
import { frameworkLogger } from '../../core/framework-logger.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';

/**
 * Registry for managing MCP server configurations
 */

/**
 * Resolve the correct framework root and MCP servers path.
 * Priority:
 *   1. STRRAY_DEV_PATH env var (explicit dev override)
 *   2. The "strray" field in the nearest package.json that declares it (works in both source tree and installed package)
 *   3. Safe fallback to node_modules/strray-ai/dist
 */
function resolveFrameworkPaths(): { frameworkRoot: string; mcpServersPath: string } {
  // Highest priority: explicit environment override
  if (process.env.STRRAY_DEV_PATH) {
    const devPath = process.env.STRRAY_DEV_PATH;
    return {
      frameworkRoot: devPath,
      mcpServersPath: join(devPath, 'mcps'),
    };
  }

  // Walk upward from this module to find the package that owns the "strray" config
  let currentDir = dirname(fileURLToPath(import.meta.url));

  // Safety limit to avoid walking the entire filesystem
  const MAX_LEVELS = 12;
  for (let i = 0; i < MAX_LEVELS; i++) {
    const pkgPath = join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'strray-ai' && pkg.strray) {
          const strrayCfg = pkg.strray as Record<string, string>;
          const frameworkRoot = currentDir;
          const declaredMcp = strrayCfg.mcpServersPath || (strrayCfg.dist ? join(strrayCfg.dist, 'mcps') : 'dist/mcps');
          return {
            frameworkRoot,
            mcpServersPath: join(frameworkRoot, declaredMcp),
          };
        }
      } catch {
        // ignore corrupt package.json
      }
    }
    const parent = dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // Final fallback (should almost never be reached)
  const fallback = 'node_modules/strray-ai/dist';
  frameworkLogger.log('server-config-registry', 'using-fallback-path', 'warning', {
    reason: 'Could not locate strray package.json with "strray" field',
    fallback,
  });
  return {
    frameworkRoot: fallback,
    mcpServersPath: join(fallback, 'mcps'),
  };
}

export class ServerConfigRegistry {
  private configs: Map<string, IServerConfig> = new Map();

  constructor() {
    this.registerDefaultConfigs();
  }

  /**
   * Register all default server configurations
   */
  private registerDefaultConfigs(): void {
    const { mcpServersPath } = resolveFrameworkPaths();
    const basePath = mcpServersPath;

    // Code Review Server
    this.register({
      serverName: 'code-review',
      command: 'node',
      args: [`${basePath}/knowledge-skills/code-review.server.js`],
      timeout: 30000,
    });

    // Security Audit Server
    this.register({
      serverName: 'security-audit',
      command: 'node',
      args: [`${basePath}/knowledge-skills/security-audit.server.js`],
      timeout: 45000,
    });

    // Performance Optimization Server
    this.register({
      serverName: 'performance-optimization',
      command: 'node',
      args: [`${basePath}/knowledge-skills/performance-optimization.server.js`],
      timeout: 30000,
    });

    // Testing Strategy Server
    this.register({
      serverName: 'testing-strategy',
      command: 'node',
      args: [`${basePath}/knowledge-skills/testing-strategy.server.js`],
      timeout: 25000,
    });

    // Researcher Server
    this.register({
      serverName: 'researcher',
      command: 'node',
      args: [`${basePath}/researcher.server.js`],
      timeout: 60000,
    });

    // Governance Service (meta-MCP that orchestrates the three skill servers + required external Dynamo)
    this.register({
      serverName: 'governance',
      command: 'node',
      args: [`${basePath}/governance.server.js`],
      timeout: 120000, // Governance can take longer because it calls multiple servers + external
    });

    // Framework Help Server
    this.register({
      serverName: 'framework-help',
      command: 'node',
      args: [`${basePath}/framework-help.server.js`],
      timeout: 15000,
    });

    // Skill Invocation Server
    this.register({
      serverName: 'skill-invocation',
      command: 'node',
      args: [`${basePath}/knowledge-skills/skill-invocation.server.js`],
      timeout: 30000,
    });

    // Code Analyzer Server
    this.register({
      serverName: 'session-management',
      command: 'node',
      args: [`${basePath}/knowledge-skills/session-management.server.js`],
      timeout: 30000,
    });

    // Code Analyzer Server
    this.register({
      serverName: 'code-analyzer',
      command: 'node',
      args: [`${basePath}/knowledge-skills/code-analyzer.server.js`],
      timeout: 45000,
    });

    // Enforcer Server
    this.register({
      serverName: 'enforcer',
      command: 'node',
      args: [`${basePath}/enforcer-tools.server.js`],
      timeout: 30000,
    });

    // Orchestrator Server
    this.register({
      serverName: 'orchestrator',
      command: 'node',
      args: [`${basePath}/orchestrator.server.js`],
      timeout: 60000,
    });

    // Estimation Validator Server
    this.register({
      serverName: 'estimation-validator',
      command: 'node',
      args: [`${basePath}/estimation.server.js`],
      timeout: 30000,
    });

    // Architect Server
    this.register({
      serverName: 'architect',
      command: 'node',
      args: [`${basePath}/architect-tools.server.js`],
      timeout: 45000,
    });

    // Bug Triage Specialist Server
    this.register({
      serverName: 'bug-triage-specialist',
      command: 'node',
      args: [`${basePath}/knowledge-skills/bug-triage-specialist.server.js`],
      timeout: 30000,
    });

    // Log Monitor Server
    this.register({
      serverName: 'log-monitor',
      command: 'node',
      args: [`${basePath}/knowledge-skills/log-monitor.server.js`],
      timeout: 30000,
    });

    // Aliases to match features.json agent names
    // Code Reviewer (alias for code-review)
    this.register({
      serverName: 'code-reviewer',
      command: 'node',
      args: [`${basePath}/knowledge-skills/code-review.server.js`],
      timeout: 30000,
    });

    // Security Auditor (alias for security-audit)
    this.register({
      serverName: 'security-auditor',
      command: 'node',
      args: [`${basePath}/knowledge-skills/security-audit.server.js`],
      timeout: 45000,
    });

    // Refactorer Server
    this.register({
      serverName: 'refactorer',
      command: 'node',
      args: [`${basePath}/knowledge-skills/refactoring-strategies.server.js`],
      timeout: 40000,
    });

    // Testing Lead (alias for testing-strategy)
    this.register({
      serverName: 'testing-lead',
      command: 'node',
      args: [`${basePath}/knowledge-skills/testing-strategy.server.js`],
      timeout: 30000,
    });

    // Auto Format Server
    this.register({
      serverName: 'auto-format',
      command: 'node',
      args: [`${basePath}/auto-format.server.js`],
      timeout: 30000,
    });

    // Boot Orchestrator Server
    this.register({
      serverName: 'boot-orchestrator',
      command: 'node',
      args: [`${basePath}/boot-orchestrator.server.js`],
      timeout: 60000,
    });

    // Framework Compliance Audit Server
    this.register({
      serverName: 'framework-compliance-audit',
      command: 'node',
      args: [`${basePath}/framework-compliance-audit.server.js`],
      timeout: 45000,
    });

    // Lint Server
    this.register({
      serverName: 'lint',
      command: 'node',
      args: [`${basePath}/lint.server.js`],
      timeout: 30000,
    });

    // Performance Analysis Server
    this.register({
      serverName: 'performance-analysis',
      command: 'node',
      args: [`${basePath}/performance-analysis.server.js`],
      timeout: 30000,
    });

    // Security Scan Server
    this.register({
      serverName: 'security-scan',
      command: 'node',
      args: [`${basePath}/security-scan.server.js`],
      timeout: 45000,
    });

    // State Manager Server
    this.register({
      serverName: 'state-manager',
      command: 'node',
      args: [`${basePath}/state-manager.server.js`],
      timeout: 30000,
    });

    // Processor Pipeline Server
    this.register({
      serverName: 'processor-pipeline',
      command: 'node',
      args: [`${basePath}/processor-pipeline.server.js`],
      timeout: 30000,
    });

    // Model Health Check Server
    this.register({
      serverName: 'model-health-check',
      command: 'node',
      args: [`${basePath}/model-health-check.server.js`],
      timeout: 30000,
    });
  }

  /**
   * Register a new server configuration
   */
  register(config: IServerConfig): void {
    this.configs.set(config.serverName, config);
  }

  /**
   * Get a server configuration by name
   */
  get(serverName: string): IServerConfig | undefined {
    return this.configs.get(serverName);
  }

  /**
   * Check if a server configuration exists
   */
  has(serverName: string): boolean {
    return this.configs.has(serverName);
  }

  /**
   * Get all registered server configurations
   */
  getAll(): IServerConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get all registered server names
   */
  getServerNames(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Clear all registered configurations
   */
  clear(): void {
    this.configs.clear();
  }

  /**
   * Create a dynamic configuration for an unknown server
   * Uses the knowledge-skills directory as default location.
   * Now respects the "strray" field declared in package.json.
   */
  createDynamicConfig(serverName: string): IServerConfig {
    // Validate serverName against path traversal attacks
    if (!serverName || serverName.includes('..') || serverName.includes('/') || serverName.includes('\\') || serverName.includes('\0')) {
      const errorMsg = `Invalid server name "${serverName}": must not contain "..", "/", "\\", or null bytes`;
      frameworkLogger.log("server-config-registry", "path-traversal-blocked", "warning", { serverName, error: errorMsg });
      throw new Error(errorMsg);
    }

    const { mcpServersPath } = resolveFrameworkPaths();
    const basePath = mcpServersPath;

    return {
      serverName,
      command: 'node',
      args: [`${basePath}/knowledge-skills/${serverName}.server.js`],
      timeout: 30000,
    };
  }
}

/**
 * Default singleton instance of the server config registry
 */
export const defaultServerRegistry = new ServerConfigRegistry();
