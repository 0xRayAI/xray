/**
 * Known Names — Single combined vocabulary for agent names, skill names,
 * system service names, and opencode built-in types. All consumers import
 * from here instead of defining their own hardcoded lists.
 *
 * Imports:
 *   - registry.ts (AGENT_REGISTRY, AGENT_KEYS) — canonical agent definitions
 *   - mcps/index.ts (MCP_SERVERS) — canonical MCP server manifest
 */

import { AGENT_KEYS, type AgentKey } from "./registry.js";
import { MCP_SERVERS } from "../mcps/index.js";

// ── Agent names (from SSOT) ──

export { AGENT_KEYS, type AgentKey };
export type { AgentKey as AgentName };

/** All agent names as a mutable array */
export function getAgentNames(): string[] {
  return [...AGENT_KEYS];
}

// ── System service names (not in AGENT_REGISTRY) ──

export const SYSTEM_SERVICE_NAMES = [
  "enforcer",
  "orchestrator",
  "analyzer",
] as const;

// ── Opencode CLI built-in types ──

export const OPENCODE_BUILTIN_TYPES = [
  "explore",
  "general",
] as const;

// ── Combined vocabulary ──

export const ALL_KNOWN_NAMES = [
  ...AGENT_KEYS,
  ...SYSTEM_SERVICE_NAMES,
  ...OPENCODE_BUILTIN_TYPES,
] as const;

export type KnownName = typeof ALL_KNOWN_NAMES[number];

// ── Boot-priority agents (loaded first by boot-orchestrator) ──

export const BOOT_AGENTS = [
  "enforcer",
  "architect",
  "bug-triage-specialist",
  "code-reviewer",
  "security-auditor",
  "refactorer",
  "testing-lead",
] as const;

// ── Validation ──

export function isValidType(name: string): boolean {
  return (ALL_KNOWN_NAMES as readonly string[]).includes(name);
}

// ── Agent → Skill alias map (single source) ──

export const AGENT_TO_SKILL_MAP: Record<string, string> = {
  "architect": "architecture-patterns",
  "backend-engineer": "api-design",
  "code-reviewer": "code-review",
  "database-engineer": "database-design",
  "devops-engineer": "devops-deployment",
  "mobile-developer": "mobile-development",
  "performance-engineer": "performance-optimization",
  "security-auditor": "security-audit",
  "testing-lead": "testing-strategy",
  "tech-writer": "documentation-generation",
  "frontend-ui-ux-engineer": "ui-ux-design",
  "frontend-engineer": "project-analysis",
};

/** Resolve agent name to skill name via alias map, fallback to identity */
export function resolveSkill(agentOrSkill: string): string {
  return AGENT_TO_SKILL_MAP[agentOrSkill] || agentOrSkill;
}

// ── MCP server names (for consumers that need them) ──

export { MCP_SERVERS };
export function getSkillNames(): string[] {
  return MCP_SERVERS.map(s => s.serverName);
}
