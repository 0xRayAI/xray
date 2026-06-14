/**
 * DefaultPlugins — Phase 2C: centralized bootstrap for all knowledge-skill
 * servers as SkillToolPlugin registrations.
 *
 * Exports registerDefaultPlugins() which is called once at boot to register
 * all 24 knowledge-skill MCP servers (plus the researcher) as in-process
 * plugin tools, making them dispatchable without MCP transport.
 */

import { frameworkLogger } from '../core/framework-logger.js';
import { pluginRegistry } from './plugin-registry.js';
import type { ToolDefinition } from './plugin-registry.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const origSetRequestHandler = Server.prototype.setRequestHandler;
Server.prototype.setRequestHandler = function (this: any, schema: any, handler: any) {
  if (schema === ListToolsRequestSchema) {
    this.__xrayListToolsHandler = handler;
  }
  if (schema === CallToolRequestSchema) {
    this.__xrayCallToolHandler = handler;
  }
  return origSetRequestHandler.call(this, schema, handler);
};

// ── Named exports (17 servers) ──────────────────────────────────────────────
import { XrayCodeReviewServer } from '../mcps/knowledge-skills/code-review.server.js';
import { XraySecurityAuditServer } from '../mcps/knowledge-skills/security-audit.server.js';
import { SkillInvocationServer } from '../mcps/knowledge-skills/skill-invocation.server.js';
import { XrayDocumentationGenerationServer } from '../mcps/knowledge-skills/tech-writer.server.js';
import { XrayDatabaseDesignServer } from '../mcps/knowledge-skills/database-design.server.js';
import { XrayPerformanceOptimizationServer } from '../mcps/knowledge-skills/performance-optimization.server.js';
import { XrayUIUXDesignServer } from '../mcps/knowledge-skills/ui-ux-design.server.js';
import { XrayDevOpsDeploymentServer } from '../mcps/knowledge-skills/devops-deployment.server.js';
import { SEOSpecialistServer } from '../mcps/knowledge-skills/seo-consultant.server.js';
import { MultimodalLookerServer } from '../mcps/knowledge-skills/multimodal-looker.server.js';
import { XrayRefactoringStrategiesServer } from '../mcps/knowledge-skills/refactoring-strategies.server.js';
import { BugTriageSpecialistServer } from '../mcps/knowledge-skills/bug-triage-specialist.server.js';
import { LogMonitorServer } from '../mcps/knowledge-skills/log-monitor.server.js';
import { XrayMobileDevelopmentServer } from '../mcps/knowledge-skills/mobile-development.server.js';
import { MarketingExpertServer } from '../mcps/knowledge-skills/growth-strategist.server.js';
import { SEOCopywriterServer } from '../mcps/knowledge-skills/content-creator.server.js';
import { StrategistServer } from '../mcps/knowledge-skills/strategist.server.js';

// ── Researcher (standalone, outside knowledge-skills) ──────────────────────
import { XrayLibrarianServer } from '../mcps/researcher.server.js';

// ── Default exports (7 servers) ─────────────────────────────────────────────
import XrayTestingStrategyServer from '../mcps/knowledge-skills/testing-strategy.server.js';
import ProjectAnalysisServer from '../mcps/knowledge-skills/project-analysis.server.js';
import CodeAnalyzerServer from '../mcps/knowledge-skills/code-analyzer.server.js';
import SessionManagementServer from '../mcps/knowledge-skills/session-management.server.js';
import XrayApiDesignServer from '../mcps/knowledge-skills/api-design.server.js';
import XrayGitWorkflowServer from '../mcps/knowledge-skills/git-workflow.server.js';
import XrayArchitecturePatternsServer from '../mcps/knowledge-skills/architecture-patterns.server.js';

// ── Named exports (additional servers) ──────────────────────────────────────
import { XrayTestingBestPracticesServer } from '../mcps/knowledge-skills/testing-best-practices.server.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface DefaultPluginsResult {
  registered: number;
  failed: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract tools and handler dispatch from a server instance.
 * Protected members are accessed via any-cast (contained compromise).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySkillServer = any;

async function toServerDescriptor(
  instance: AnySkillServer,
  serverName: string,
): Promise<{ name: string; tools: ToolDefinition[]; callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown> }> {
  const srv = instance as {
    tools?: ToolDefinition[];
    handlers?: Record<string, (args: unknown) => Promise<unknown>>;
    server?: {
      __xrayListToolsHandler?: () => Promise<{ tools: ToolDefinition[] }>;
      __xrayCallToolHandler?: (req: { params: { name: string; arguments: Record<string, unknown> } }) => Promise<unknown>;
    };
  };
  const tools = srv.tools ?? [];
  const handlers = srv.handlers ?? {};

  // Try captured handlers from the inner MCP Server instance
  const mcp = srv.server;
  const listHandler = mcp?.__xrayListToolsHandler ?? (srv as any).__xrayListToolsHandler;
  const callHandler = mcp?.__xrayCallToolHandler ?? (srv as any).__xrayCallToolHandler;

  if (tools.length === 0 && listHandler) {
    try {
      const listResult = await listHandler();
      if (listResult?.tools?.length) {
        return {
          name: serverName,
          tools: listResult.tools,
          callTool: async (toolName, args) => {
            if (!callHandler) {
              throw new Error(`Unknown tool '${toolName}' on server '${serverName}'`);
            }
            return callHandler({ params: { name: toolName, arguments: args } });
          },
        };
      }
    } catch {
      // fall through to default
    }
  }

  return {
    name: serverName,
    tools,
    callTool: async (toolName, args) => {
      const handler = handlers[toolName];
      if (!handler) {
        throw new Error(`Unknown tool '${toolName}' on server '${serverName}'`);
      }
      return handler(args);
    },
  };
}

async function registerOne(
  label: string,
  create: () => AnySkillServer,
  serverName: string,
): Promise<boolean> {
  try {
    const instance = create();
    const descriptor = await toServerDescriptor(instance, serverName);
    pluginRegistry.registerServer(descriptor);
    frameworkLogger.log('default-plugins', `register-${label}`, 'info', { serverName });
    return true;
  } catch (error) {
    frameworkLogger.log('default-plugins', `register-${label}`, 'error', {
      serverName,
      error: String(error),
    });
    return false;
  }
}

// ── Batches ─────────────────────────────────────────────────────────────────

async function registerBatch(tag: string, servers: Array<{
  label: string;
  create: () => AnySkillServer;
  serverName: string;
}>): Promise<number> {
  let count = 0;
  for (const s of servers) {
    if (await registerOne(s.label, s.create, s.serverName)) {
      count++;
    }
  }
  frameworkLogger.log('default-plugins', `batch-${tag}`, 'info', {
    registered: count,
    total: servers.length,
  });
  return count;
}

/**
 * Register all knowledge-skill servers as SkillToolPlugins.
 * Called once at boot. Returns counts of registered and failed servers.
 */
export async function registerDefaultPlugins(): Promise<DefaultPluginsResult> {
  const failed: string[] = [];

  // ── Batch 1: Governance-critical (priority) ──
  const batch1Count = await registerBatch('governance', [
    { label: 'code-review',      create: () => new XrayCodeReviewServer(),        serverName: 'code-review' },
    { label: 'security-audit',   create: () => new XraySecurityAuditServer(),     serverName: 'security-audit' },
    { label: 'researcher',       create: () => new XrayLibrarianServer(),          serverName: 'researcher' },
  ]);

  // ── Batch 2: Design & Architecture ──
  const batch2Count = await registerBatch('design-architecture', [
    { label: 'api-design',              create: () => new XrayApiDesignServer(),              serverName: 'api-design' },
    { label: 'architecture-patterns',   create: () => new XrayArchitecturePatternsServer(),   serverName: 'architecture-patterns' },
    { label: 'database-design',         create: () => new XrayDatabaseDesignServer(),         serverName: 'database-design' },
    { label: 'mobile-development',      create: () => new XrayMobileDevelopmentServer(),      serverName: 'mobile-development' },
    { label: 'ui-ux-design',            create: () => new XrayUIUXDesignServer(),              serverName: 'ui-ux-design' },
  ]);

  // ── Batch 3: Analysis & Quality ──
  const batch3Count = await registerBatch('analysis-quality', [
    { label: 'code-analyzer',               create: () => new CodeAnalyzerServer(),               serverName: 'code-analyzer' },
    { label: 'performance-optimization',    create: () => new XrayPerformanceOptimizationServer(), serverName: 'performance-optimization' },
    { label: 'project-analysis',            create: () => new ProjectAnalysisServer(),             serverName: 'project-analysis' },
    { label: 'refactoring-strategies',      create: () => new XrayRefactoringStrategiesServer(),   serverName: 'refactoring-strategies' },
    { label: 'testing-strategy',            create: () => new XrayTestingStrategyServer(),         serverName: 'testing-strategy' },
  ]);

  // ── Batch 4: Operations & Workflow ──
  const batch4Count = await registerBatch('operations-workflow', [
    { label: 'devops-deployment',     create: () => new XrayDevOpsDeploymentServer(),     serverName: 'devops-deployment' },
    { label: 'git-workflow',          create: () => new XrayGitWorkflowServer(),          serverName: 'git-workflow' },
    { label: 'log-monitor',           create: () => new LogMonitorServer(),               serverName: 'log-monitor' },
    { label: 'session-management',    create: () => new SessionManagementServer(),        serverName: 'session-management' },
    { label: 'strategist',            create: () => new StrategistServer(),               serverName: 'xray/strategist' },
  ]);

  // ── Batch 5: Content & Growth ──
  const batch5Count = await registerBatch('content-growth', [
    { label: 'content-creator',        create: () => new SEOCopywriterServer(),        serverName: 'content-creator' },
    { label: 'growth-strategist',      create: () => new MarketingExpertServer(),      serverName: 'growth-strategist' },
    { label: 'multimodal-looker',      create: () => new MultimodalLookerServer(),     serverName: 'multimodal-looker' },
    { label: 'seo-consultant',         create: () => new SEOSpecialistServer(),        serverName: 'seo-consultant' },
    { label: 'documentation-generation', create: () => new XrayDocumentationGenerationServer(), serverName: 'documentation-generation' },
  ]);

  // ── Batch 6: Specialized ──
  const batch6Count = await registerBatch('specialized', [
    { label: 'bug-triage-specialist',    create: () => new BugTriageSpecialistServer() as any,        serverName: 'bug-triage-specialist' },
    { label: 'skill-invocation',         create: () => new SkillInvocationServer() as any,           serverName: 'xray/skill-invocation' },
    { label: 'testing-best-practices',   create: () => new XrayTestingBestPracticesServer(),    serverName: 'testing-best-practices' },
  ]);

  const registered = batch1Count + batch2Count + batch3Count + batch4Count + batch5Count + batch6Count;

  frameworkLogger.log('default-plugins', 'register-default-plugins-complete', 'info', {
    registered,
    failedCount: failed.length,
  });

  return { registered, failed };
}
