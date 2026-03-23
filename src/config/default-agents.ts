/**
 * Default Agent Configurations
 *
 * Centralized agent definitions for the StringRay delegation system.
 * This file externalizes all hardcoded agent configurations.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */

export interface DefaultAgentConfig {
  name: string;
  capabilities: string[];
  status: "active" | "inactive";
  expertise: string;
  capacity: number;
  performance: number;
  specialties: string[];
}

export const DEFAULT_AGENTS: DefaultAgentConfig[] = [
  {
    name: "enforcer",
    capabilities: ["code-quality", "validation"],
    status: "active",
    expertise: "code quality enforcement",
    capacity: 100,
    performance: 95,
    specialties: ["validation", "compliance"],
  },
  {
    name: "architect",
    capabilities: ["design", "planning"],
    status: "active",
    expertise: "system architecture",
    capacity: 90,
    performance: 85,
    specialties: ["design", "planning"],
  },
  {
    name: "orchestrator",
    capabilities: [
      "task-coordination",
      "multi-agent-management",
      "workflow-orchestration",
    ],
    status: "active",
    expertise: "orchestrating complex multi-agent workflows",
    capacity: 90,
    performance: 85,
    specialties: ["coordination", "delegation", "workflow"],
  },
  {
    name: "log-monitor",
    capabilities: ["log-analysis", "pattern-detection", "alerting"],
    status: "active",
    expertise: "log monitoring and analysis",
    capacity: 60,
    performance: 75,
    specialties: ["logs", "monitoring", "alerts"],
  },
  {
    name: "researcher",
    capabilities: [
      "code-search",
      "documentation-lookup",
      "implementation-search",
    ],
    status: "active",
    expertise: "codebase search and documentation",
    capacity: 80,
    performance: 85,
    specialties: ["search", "docs", "patterns"],
  },
  {
    name: "multimodal-looker",
    capabilities: [
      "image-analysis",
      "diagram-understanding",
      "visual-inspection",
    ],
    status: "active",
    expertise: "analyzing images and visual content",
    capacity: 70,
    performance: 80,
    specialties: ["images", "diagrams", "screenshots"],
  },
  {
    name: "code-analyzer",
    capabilities: ["code-analysis", "pattern-detection", "metrics"],
    status: "active",
    expertise: "deep code analysis",
    capacity: 75,
    performance: 80,
    specialties: ["analysis", "metrics", "patterns"],
  },
  {
    name: "code-reviewer",
    capabilities: ["review", "quality"],
    status: "active",
    expertise: "code review",
    capacity: 80,
    performance: 80,
    specialties: ["review", "quality"],
  },
  {
    name: "security-auditor",
    capabilities: ["security", "audit"],
    status: "active",
    expertise: "security analysis",
    capacity: 70,
    performance: 75,
    specialties: ["security", "audit"],
  },
  {
    name: "testing-lead",
    capabilities: ["testing", "coverage"],
    status: "active",
    expertise: "test architecture",
    capacity: 85,
    performance: 80,
    specialties: ["testing", "coverage"],
  },
  {
    name: "refactorer",
    capabilities: ["refactoring", "optimization"],
    status: "active",
    expertise: "code refactoring",
    capacity: 75,
    performance: 85,
    specialties: ["refactoring", "optimization"],
  },
  {
    name: "bug-triage-specialist",
    capabilities: ["debugging", "analysis"],
    status: "active",
    expertise: "bug triage",
    capacity: 60,
    performance: 70,
    specialties: ["debugging", "analysis"],
  },
  {
    name: "strategist",
    capabilities: [
      "strategic-planning",
      "complex-problem-solving",
      "architecture-design",
      "technical-strategy",
      "risk-assessment",
    ],
    status: "active",
    expertise: "strategic guidance and complex problem-solving",
    capacity: 100,
    performance: 95,
    specialties: ["architecture decisions", "technical strategy", "risk analysis"],
  },
  {
    name: "seo-consultant",
    capabilities: [
      "technical-seo-audit",
      "schema-markup-generation",
      "robots-txt-optimization",
      "core-web-vitals-optimization",
      "ai-search-optimization",
    ],
    status: "active",
    expertise: "technical SEO optimization",
    capacity: 70,
    performance: 80,
    specialties: ["schema", "robots.txt", "Core Web Vitals", "AI search"],
  },
  {
    name: "content-creator",
    capabilities: [
      "seo-content-writing",
      "keyword-optimization",
      "meta-description",
      "content-strategy",
    ],
    status: "active",
    expertise: "SEO content creation",
    capacity: 65,
    performance: 75,
    specialties: ["content", "keywords", "metadata"],
  },
  {
    name: "growth-strategist",
    capabilities: [
      "campaign-strategy",
      "market-analysis",
      "brand-positioning",
      "content-marketing-strategy",
    ],
    status: "active",
    expertise: "strategic marketing",
    capacity: 75,
    performance: 80,
    specialties: ["campaigns", "branding", "growth"],
  },
  {
    name: "database-engineer",
    capabilities: [
      "schema-design",
      "query-optimization",
      "migrations",
      "data-modeling",
    ],
    status: "active",
    expertise: "database architecture",
    capacity: 70,
    performance: 75,
    specialties: ["schema", "performance", "migrations"],
  },
  {
    name: "devops-engineer",
    capabilities: [
      "ci-cd",
      "infrastructure",
      "containerization",
      "monitoring",
    ],
    status: "active",
    expertise: "DevOps and infrastructure",
    capacity: 70,
    performance: 75,
    specialties: ["CI/CD", "Kubernetes", "AWS"],
  },
  {
    name: "backend-engineer",
    capabilities: [
      "api-design",
      "server-logic",
      "database-integration",
      "security",
    ],
    status: "active",
    expertise: "backend development",
    capacity: 80,
    performance: 85,
    specialties: ["APIs", "Node.js", "databases"],
  },
  {
    name: "frontend-engineer",
    capabilities: [
      "ui-development",
      "component-design",
      "state-management",
      "accessibility",
    ],
    status: "active",
    expertise: "frontend development",
    capacity: 80,
    performance: 85,
    specialties: ["React", "TypeScript", "CSS"],
  },
  {
    name: "performance-engineer",
    capabilities: [
      "performance-optimization",
      "profiling",
      "caching",
      "load-testing",
    ],
    status: "active",
    expertise: "performance optimization",
    capacity: 65,
    performance: 80,
    specialties: ["profiling", "caching", "optimization"],
  },
  {
    name: "mobile-developer",
    capabilities: [
      "ios-development",
      "android-development",
      "cross-platform",
      "mobile-ui",
    ],
    status: "active",
    expertise: "mobile app development",
    capacity: 70,
    performance: 75,
    specialties: ["React Native", "iOS", "Android"],
  },
  {
    name: "tech-writer",
    capabilities: [
      "api-documentation",
      "markdown",
      "technical-writing",
      "examples",
    ],
    status: "active",
    expertise: "technical documentation",
    capacity: 70,
    performance: 80,
    specialties: ["API docs", "guides", "READMEs"],
  },
];

export function getDefaultAgents(): DefaultAgentConfig[] {
  return DEFAULT_AGENTS;
}

export function getDefaultAgentByName(name: string): DefaultAgentConfig | undefined {
  return DEFAULT_AGENTS.find(agent => agent.name === name);
}
