/**
 * xray MCP Server Manifest
 *
 * Canonical registry of all MCP servers. Add new servers here.
 * Each entry documents the server name, source file, and server type.
 */

export interface McpServerEntry {
  serverName: string;
  sourceFile: string;
  type: "top-level" | "knowledge-skill" | "orchestrator";
  registered: boolean;
  description: string;
}

export const MCP_SERVERS: McpServerEntry[] = [
  // ── Top-level servers ──
  { serverName: "architect-tools", sourceFile: "mcps/architect-tools.server.ts", type: "top-level", registered: true, description: "Architect design tools" },
  { serverName: "auto-format", sourceFile: "mcps/auto-format.server.ts", type: "top-level", registered: true, description: "Auto-format code" },
  { serverName: "boot-orchestrator", sourceFile: "mcps/boot-orchestrator.server.ts", type: "top-level", registered: true, description: "Boot sequence orchestration" },
  { serverName: "enforcer", sourceFile: "mcps/enforcer-tools.server.ts", type: "top-level", registered: true, description: "Codex compliance enforcement" },
  { serverName: "estimation-validator", sourceFile: "mcps/estimation.server.ts", type: "top-level", registered: true, description: "Task estimation validation" },
  { serverName: "framework-compliance-audit", sourceFile: "mcps/framework-compliance-audit.server.ts", type: "top-level", registered: true, description: "Framework compliance audits" },
  { serverName: "framework-help", sourceFile: "mcps/framework-help.server.ts", type: "top-level", registered: true, description: "Framework help and guidance" },
  { serverName: "governance", sourceFile: "mcps/governance.server.ts", type: "top-level", registered: true, description: "Governance deliberation pipeline" },
  { serverName: "lint", sourceFile: "mcps/lint.server.ts", type: "top-level", registered: true, description: "Code linting" },
  { serverName: "model-health-check", sourceFile: "mcps/model-health-check.server.ts", type: "top-level", registered: true, description: "Model health monitoring" },
  { serverName: "performance-analysis", sourceFile: "mcps/performance-analysis.server.ts", type: "top-level", registered: true, description: "Performance analysis" },
  { serverName: "processor-pipeline", sourceFile: "mcps/processor-pipeline.server.ts", type: "top-level", registered: true, description: "Processor pipeline" },
  { serverName: "researcher", sourceFile: "mcps/researcher.server.ts", type: "top-level", registered: true, description: "Codebase exploration" },
  { serverName: "security-scan", sourceFile: "mcps/security-scan.server.ts", type: "top-level", registered: true, description: "Security vulnerability scanning" },
  { serverName: "state-manager", sourceFile: "mcps/state-manager.server.ts", type: "top-level", registered: true, description: "State management" },

  // ── Knowledge skill servers ──
  { serverName: "api-design", sourceFile: "mcps/knowledge-skills/api-design.server.ts", type: "knowledge-skill", registered: false, description: "API design expertise" },
  { serverName: "architecture-patterns", sourceFile: "mcps/knowledge-skills/architecture-patterns.server.ts", type: "knowledge-skill", registered: false, description: "Architecture pattern guidance" },
  { serverName: "bug-triage-specialist", sourceFile: "mcps/knowledge-skills/bug-triage-specialist.server.ts", type: "knowledge-skill", registered: true, description: "Bug triage and investigation" },
  { serverName: "code-analyzer", sourceFile: "mcps/knowledge-skills/code-analyzer.server.ts", type: "knowledge-skill", registered: true, description: "Static code analysis" },
  { serverName: "code-review", sourceFile: "mcps/knowledge-skills/code-review.server.ts", type: "knowledge-skill", registered: true, description: "Code review and quality assessment" },
  { serverName: "content-creator", sourceFile: "mcps/knowledge-skills/content-creator.server.ts", type: "knowledge-skill", registered: false, description: "Content creation" },
  { serverName: "database-design", sourceFile: "mcps/knowledge-skills/database-design.server.ts", type: "knowledge-skill", registered: false, description: "Database design expertise" },
  { serverName: "devops-deployment", sourceFile: "mcps/knowledge-skills/devops-deployment.server.ts", type: "knowledge-skill", registered: false, description: "DevOps and deployment" },
  { serverName: "git-workflow", sourceFile: "mcps/knowledge-skills/git-workflow.server.ts", type: "knowledge-skill", registered: false, description: "Git workflow guidance" },
  { serverName: "growth-strategist", sourceFile: "mcps/knowledge-skills/growth-strategist.server.ts", type: "knowledge-skill", registered: false, description: "Growth strategy" },
  { serverName: "log-monitor", sourceFile: "mcps/knowledge-skills/log-monitor.server.ts", type: "knowledge-skill", registered: true, description: "Log monitoring" },
  { serverName: "mobile-development", sourceFile: "mcps/knowledge-skills/mobile-development.server.ts", type: "knowledge-skill", registered: false, description: "Mobile development" },
  { serverName: "multimodal-looker", sourceFile: "mcps/knowledge-skills/multimodal-looker.server.ts", type: "knowledge-skill", registered: false, description: "Multimodal file analysis" },
  { serverName: "performance-optimization", sourceFile: "mcps/knowledge-skills/performance-optimization.server.ts", type: "knowledge-skill", registered: true, description: "Performance optimization" },
  { serverName: "project-analysis", sourceFile: "mcps/knowledge-skills/project-analysis.server.ts", type: "knowledge-skill", registered: false, description: "Project analysis" },
  { serverName: "refactoring-strategies", sourceFile: "mcps/knowledge-skills/refactoring-strategies.server.ts", type: "knowledge-skill", registered: true, description: "Refactoring strategies" },
  { serverName: "security-audit", sourceFile: "mcps/knowledge-skills/security-audit.server.ts", type: "knowledge-skill", registered: true, description: "Security auditing" },
  { serverName: "seo-consultant", sourceFile: "mcps/knowledge-skills/seo-consultant.server.ts", type: "knowledge-skill", registered: false, description: "SEO consulting" },
  { serverName: "session-management", sourceFile: "mcps/knowledge-skills/session-management.server.ts", type: "knowledge-skill", registered: true, description: "Session management" },
  { serverName: "skill-invocation", sourceFile: "mcps/knowledge-skills/skill-invocation.server.ts", type: "knowledge-skill", registered: true, description: "Skill invocation" },
  { serverName: "strategist", sourceFile: "mcps/knowledge-skills/strategist.server.ts", type: "knowledge-skill", registered: false, description: "Strategic planning" },
  { serverName: "tech-writer", sourceFile: "mcps/knowledge-skills/tech-writer.server.ts", type: "knowledge-skill", registered: false, description: "Technical writing" },
  { serverName: "testing-strategy", sourceFile: "mcps/knowledge-skills/testing-strategy.server.ts", type: "knowledge-skill", registered: true, description: "Testing strategy" },
  { serverName: "ui-ux-design", sourceFile: "mcps/knowledge-skills/ui-ux-design.server.ts", type: "knowledge-skill", registered: false, description: "UI/UX design" },

  // ── Orchestrator server ──
  { serverName: "orchestrator", sourceFile: "mcps/orchestrator/server.ts", type: "orchestrator", registered: true, description: "thinDispatch 7-flow orchestration" },

  // ── Aliases (point to same source as primary) ──
  { serverName: "code-reviewer", sourceFile: "mcps/knowledge-skills/code-review.server.ts", type: "knowledge-skill", registered: true, description: "Alias for code-review" },
  { serverName: "security-auditor", sourceFile: "mcps/knowledge-skills/security-audit.server.ts", type: "knowledge-skill", registered: true, description: "Alias for security-audit" },
  { serverName: "testing-lead", sourceFile: "mcps/knowledge-skills/testing-strategy.server.ts", type: "knowledge-skill", registered: true, description: "Alias for testing-strategy" },
];

export function getMcpServer(serverName: string): McpServerEntry | undefined {
  return MCP_SERVERS.find(s => s.serverName === serverName);
}

export function getRegisteredServers(): McpServerEntry[] {
  return MCP_SERVERS.filter(s => s.registered);
}

export function getUnregisteredServers(): McpServerEntry[] {
  return MCP_SERVERS.filter(s => !s.registered);
}
