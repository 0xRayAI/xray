/**
 * Agent Expertise Configuration
 *
 * Defines expertise levels for weighted voting across all 0xRay agents.
 * Higher expertise = higher weight in voting decisions.
 *
 * @version 1.0.0
 * @since 2026-04-16
 */

import type { AgentExpertise } from "./voting-types.js";

export const AGENT_EXPERTISE_LEVELS: Record<string, AgentExpertise> = {
  architect: {
    name: "architect",
    expertiseLevel: 10,
    domain: "system design",
    specialties: ["design", "planning", "architecture"],
  },
  "security-auditor": {
    name: "security-auditor",
    expertiseLevel: 10,
    domain: "security",
    specialties: ["security", "audit", "vulnerability-detection"],
  },
  strategist: {
    name: "strategist",
    expertiseLevel: 9,
    domain: "strategy",
    specialties: ["planning", "roadmap", "decision-making"],
  },
  refactorer: {
    name: "refactorer",
    expertiseLevel: 8,
    domain: "refactoring",
    specialties: ["optimization", "technical-debt", "consolidation"],
  },
  "testing-lead": {
    name: "testing-lead",
    expertiseLevel: 8,
    domain: "testing",
    specialties: ["test-architecture", "coverage", "quality"],
  },
  "code-reviewer": {
    name: "code-reviewer",
    expertiseLevel: 8,
    domain: "review",
    specialties: ["quality", "standards", "best-practices"],
  },
  "bug-triage-specialist": {
    name: "bug-triage-specialist",
    expertiseLevel: 7,
    domain: "debugging",
    specialties: ["bug-detection", "root-cause", "surgical-fixes"],
  },
  "database-engineer": {
    name: "database-engineer",
    expertiseLevel: 8,
    domain: "database",
    specialties: ["schema", "query-optimization", "migrations"],
  },
  "backend-engineer": {
    name: "backend-engineer",
    expertiseLevel: 7,
    domain: "backend",
    specialties: ["api", "server", "microservices"],
  },
  "frontend-engineer": {
    name: "frontend-engineer",
    expertiseLevel: 7,
    domain: "frontend",
    specialties: ["ui", "react", "responsive"],
  },
  "frontend-ui-ux-engineer": {
    name: "frontend-ui-ux-engineer",
    expertiseLevel: 8,
    domain: "ui-ux",
    specialties: ["design", "accessibility", "user-experience"],
  },
  "devops-engineer": {
    name: "devops-engineer",
    expertiseLevel: 7,
    domain: "devops",
    specialties: ["ci-cd", "infrastructure", "deployment"],
  },
  researcher: {
    name: "researcher",
    expertiseLevel: 6,
    domain: "research",
    specialties: ["search", "documentation", "patterns"],
  },
  "code-analyzer": {
    name: "code-analyzer",
    expertiseLevel: 7,
    domain: "analysis",
    specialties: ["metrics", "patterns", "static-analysis"],
  },
  "performance-engineer": {
    name: "performance-engineer",
    expertiseLevel: 8,
    domain: "performance",
    specialties: ["profiling", "optimization", "benchmarking"],
  },
  "log-monitor": {
    name: "log-monitor",
    expertiseLevel: 5,
    domain: "monitoring",
    specialties: ["logs", "alerts", "pattern-detection"],
  },
  "content-creator": {
    name: "content-creator",
    expertiseLevel: 5,
    domain: "content",
    specialties: ["writing", "seo", "marketing"],
  },
  "growth-strategist": {
    name: "growth-strategist",
    expertiseLevel: 7,
    domain: "growth",
    specialties: ["marketing", "conversion", "analysis"],
  },
  "seo-consultant": {
    name: "seo-consultant",
    expertiseLevel: 7,
    domain: "seo",
    specialties: ["search-optimization", "schema", "performance"],
  },
  "mobile-developer": {
    name: "mobile-developer",
    expertiseLevel: 6,
    domain: "mobile",
    specialties: ["ios", "android", "react-native"],
  },
  "tech-writer": {
    name: "tech-writer",
    expertiseLevel: 6,
    domain: "documentation",
    specialties: ["docs", "readme", "api-docs"],
  },
};

export function getAgentExpertise(agentName: string): AgentExpertise | undefined {
  return AGENT_EXPERTISE_LEVELS[agentName];
}

export function getAgentExpertiseLevel(agentName: string): number {
  return AGENT_EXPERTISE_LEVELS[agentName]?.expertiseLevel ?? 5;
}

export function getVotingWeight(agentName: string): number {
  const level = getAgentExpertiseLevel(agentName);
  return level * 10;
}

export function getAgentsWithExpertiseDomain(
  domain: string,
): AgentExpertise[] {
  return Object.values(AGENT_EXPERTISE_LEVELS).filter(
    (agent) => agent.domain === domain || agent.specialties.some((s) => domain.includes(s)),
  );
}

export function getTopExpertsForDomain(domain: string, count: number = 3): AgentExpertise[] {
  const domainExperts = getAgentsWithExpertiseDomain(domain);
  return domainExperts
    .sort((a, b) => b.expertiseLevel - a.expertiseLevel)
    .slice(0, count);
}