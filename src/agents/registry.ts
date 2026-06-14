/**
 * Agent Registry
 * 
 * ARCHITECTURE NOTE (2026-04-17):
 * After discovering that orchestration/enforcement happen at plugin level
 * (not via agents), we differentiate between:
 * - AGENTS: True coordinators that need spawning (architect, strategist)
 * - SKILLS: MCP-based capabilities invoked via skill tools (most others)
 * 
 * The agent-delegator handles orchestration based on complexity analysis.
 * Enforcement happens via preValidate processor and MCP servers.
 * Agents are mainly prompts with skills - they don't route or orchestrate.
 */

export interface AgentRegistryEntry {
  name: string;
  description: string;
  capabilities: string[];
  capacity: number;
  specialties: string[];
  mode: "primary" | "subagent";
  maxComplexity: number;
  concurrentTasks: number;
  status: "active" | "inactive";
  performance: number;
  expertise: string;
}

export const AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  architect: {
    name: "architect",
    description: "System design & technical decisions",
    capabilities: ["design", "planning"],
    capacity: 90,
    specialties: ["design", "planning"],
    mode: "primary",
    maxComplexity: 50,
    concurrentTasks: 2,
    status: "active",
    performance: 85,
    expertise: "system architecture",
  },
  "bug-triage-specialist": {
    name: "bug-triage-specialist",
    description: "Error investigation & surgical fixes",
    capabilities: ["debugging", "analysis"],
    capacity: 60,
    specialties: ["debugging", "analysis"],
    mode: "subagent",
    maxComplexity: 40,
    concurrentTasks: 2,
    status: "active",
    performance: 70,
    expertise: "bug triage",
  },
  "code-reviewer": {
    name: "code-reviewer",
    description: "Quality assessment & standards validation",
    capabilities: ["review", "quality"],
    capacity: 80,
    specialties: ["review", "quality"],
    mode: "subagent",
    maxComplexity: 30,
    concurrentTasks: 4,
    status: "active",
    performance: 80,
    expertise: "code review",
  },
  "security-auditor": {
    name: "security-auditor",
    description: "Vulnerability detection & compliance",
    capabilities: ["security", "audit"],
    capacity: 70,
    specialties: ["security", "audit"],
    mode: "subagent",
    maxComplexity: 35,
    concurrentTasks: 2,
    status: "active",
    performance: 75,
    expertise: "security analysis",
  },
  refactorer: {
    name: "refactorer",
    description: "Technical debt elimination & code consolidation",
    capabilities: ["refactoring", "optimization"],
    capacity: 75,
    specialties: ["refactoring", "optimization"],
    mode: "subagent",
    maxComplexity: 45,
    concurrentTasks: 1,
    status: "active",
    performance: 85,
    expertise: "code refactoring",
  },
  "testing-lead": {
    name: "testing-lead",
    description: "Testing strategy & coverage optimization",
    capabilities: ["testing", "coverage"],
    capacity: 85,
    specialties: ["testing", "coverage"],
    mode: "subagent",
    maxComplexity: 38,
    concurrentTasks: 3,
    status: "active",
    performance: 80,
    expertise: "test architecture",
  },
  "log-monitor": {
    name: "log-monitor",
    description: "Log analysis & pattern detection",
    capabilities: ["log-analysis", "pattern-detection", "alerting"],
    capacity: 60,
    specialties: ["logs", "monitoring", "alerts"],
    mode: "subagent",
    maxComplexity: 20,
    concurrentTasks: 5,
    status: "active",
    performance: 75,
    expertise: "log monitoring and analysis",
  },
  researcher: {
    name: "researcher",
    description: "Codebase exploration & documentation search",
    capabilities: ["code-search", "documentation-lookup", "implementation-search"],
    capacity: 80,
    specialties: ["search", "docs", "patterns"],
    mode: "subagent",
    maxComplexity: 30,
    concurrentTasks: 3,
    status: "active",
    performance: 85,
    expertise: "codebase search and documentation",
  },
  "code-analyzer": {
    name: "code-analyzer",
    description: "Deep code analysis & pattern detection",
    capabilities: ["code-analysis", "pattern-detection", "metrics"],
    capacity: 75,
    specialties: ["analysis", "metrics", "patterns"],
    mode: "subagent",
    maxComplexity: 35,
    concurrentTasks: 3,
    status: "active",
    performance: 80,
    expertise: "deep code analysis",
  },
  "backend-engineer": {
    name: "backend-engineer",
    description: "API & backend development",
    capabilities: ["api-design", "server-architecture", "microservices"],
    capacity: 85,
    specialties: ["api", "microservices", "server"],
    mode: "subagent",
    maxComplexity: 50,
    concurrentTasks: 3,
    status: "active",
    performance: 85,
    expertise: "backend development and API design",
  },
  "content-creator": {
    name: "content-creator",
    description: "Marketing copy & content writing",
    capabilities: ["content-writing", "seo-copy", "marketing-copy", "social-media"],
    capacity: 75,
    specialties: ["copy", "marketing", "social"],
    mode: "subagent",
    maxComplexity: 40,
    concurrentTasks: 3,
    status: "active",
    performance: 80,
    expertise: "content creation and marketing copy",
  },
  "database-engineer": {
    name: "database-engineer",
    description: "Database design & optimization",
    capabilities: ["schema-design", "query-optimization", "migrations", "sql-nosql"],
    capacity: 80,
    specialties: ["database", "sql", "migrations"],
    mode: "subagent",
    maxComplexity: 50,
    concurrentTasks: 2,
    status: "active",
    performance: 85,
    expertise: "database design and optimization",
  },
  "devops-engineer": {
    name: "devops-engineer",
    description: "DevOps & infrastructure automation",
    capabilities: ["ci-cd", "docker", "kubernetes", "infrastructure", "deployment"],
    capacity: 80,
    specialties: ["ci-cd", "docker", "infrastructure"],
    mode: "subagent",
    maxComplexity: 50,
    concurrentTasks: 2,
    status: "active",
    performance: 85,
    expertise: "DevOps and infrastructure automation",
  },
  "frontend-engineer": {
    name: "frontend-engineer",
    description: "Frontend development & UI engineering",
    capabilities: ["react", "vue", "angular", "ui-components", "responsive-design"],
    capacity: 85,
    specialties: ["react", "vue", "components"],
    mode: "subagent",
    maxComplexity: 50,
    concurrentTasks: 3,
    status: "active",
    performance: 85,
    expertise: "frontend development and UI engineering",
  },
  "frontend-ui-ux-engineer": {
    name: "frontend-ui-ux-engineer",
    description: "UI/UX design & visual engineering",
    capabilities: ["ui-design", "ux-patterns", "accessibility", "design-systems", "visual-design"],
    capacity: 75,
    specialties: ["ui", "ux", "accessibility", "design"],
    mode: "subagent",
    maxComplexity: 45,
    concurrentTasks: 2,
    status: "active",
    performance: 80,
    expertise: "UI/UX design and visual engineering",
  },
  "growth-strategist": {
    name: "growth-strategist",
    description: "Marketing strategy & growth",
    capabilities: ["marketing-strategy", "conversion-optimization", "user-acquisition", "analytics"],
    capacity: 70,
    specialties: ["growth", "marketing", "analytics"],
    mode: "subagent",
    maxComplexity: 40,
    concurrentTasks: 2,
    status: "active",
    performance: 80,
    expertise: "growth strategy and marketing",
  },
  "mobile-developer": {
    name: "mobile-developer",
    description: "Mobile app development",
    capabilities: ["ios", "android", "react-native", "flutter", "mobile-first-design"],
    capacity: 80,
    specialties: ["mobile", "ios", "android"],
    mode: "subagent",
    maxComplexity: 50,
    concurrentTasks: 2,
    status: "active",
    performance: 85,
    expertise: "mobile application development",
  },
  "performance-engineer": {
    name: "performance-engineer",
    description: "Performance optimization & profiling",
    capabilities: ["profiling", "optimization", "benchmarking", "latency", "caching"],
    capacity: 80,
    specialties: ["performance", "profiling", "optimization"],
    mode: "subagent",
    maxComplexity: 45,
    concurrentTasks: 2,
    status: "active",
    performance: 90,
    expertise: "performance optimization and profiling",
  },
  "seo-consultant": {
    name: "seo-consultant",
    description: "SEO analysis & optimization",
    capabilities: ["seo-audits", "keyword-research", "technical-seo", "content-optimization"],
    capacity: 75,
    specialties: ["seo", "keywords", "technical-seo"],
    mode: "subagent",
    maxComplexity: 40,
    concurrentTasks: 3,
    status: "active",
    performance: 80,
    expertise: "search engine optimization",
  },
  strategist: {
    name: "strategist",
    description: "Strategic guidance & complex problem-solving",
    capabilities: ["architecture-decisions", "technical-roadmap", "risk-analysis", "system-design"],
    capacity: 70,
    specialties: ["strategy", "roadmap", "architecture"],
    mode: "subagent",
    maxComplexity: 60,
    concurrentTasks: 1,
    status: "active",
    performance: 85,
    expertise: "strategic guidance and architecture decisions",
  },
  "tech-writer": {
    name: "tech-writer",
    description: "Technical documentation generation",
    capabilities: ["documentation", "readme", "api-docs", "guides", "technical-writing"],
    capacity: 80,
    specialties: ["docs", "readme", "api-docs"],
    mode: "subagent",
    maxComplexity: 28,
    concurrentTasks: 3,
    status: "active",
    performance: 85,
    expertise: "technical documentation and writing",
  },
};

export function getActiveAgents(): string[] {
  return Object.values(AGENT_REGISTRY)
    .filter((entry) => entry.status === "active")
    .map((entry) => entry.name);
}

export function getAgentEntry(name: string): AgentRegistryEntry | undefined {
  return AGENT_REGISTRY[name];
}

export function isAllowedAgent(name: string): boolean {
  return AGENT_REGISTRY[name]?.status === "active";
}

export function getAgentCapabilities(name: string): string[] {
  return AGENT_REGISTRY[name]?.capabilities ?? [];
}

export function validateRegistryConsistency(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const [key, entry] of Object.entries(AGENT_REGISTRY)) {
    if (entry.name !== key) {
      errors.push(`Registry key "${key}" does not match entry.name "${entry.name}"`);
    }

    if (names.has(entry.name)) {
      errors.push(`Duplicate agent name: "${entry.name}"`);
    }
    names.add(entry.name);

    if (!entry.description) {
      errors.push(`Agent "${key}" missing description`);
    }

    if (!Array.isArray(entry.capabilities) || entry.capabilities.length === 0) {
      errors.push(`Agent "${key}" has empty or invalid capabilities`);
    }

    if (!["primary", "subagent"].includes(entry.mode)) {
      errors.push(`Agent "${key}" has invalid mode: "${entry.mode}"`);
    }

    if (!["active", "inactive"].includes(entry.status)) {
      errors.push(`Agent "${key}" has invalid status: "${entry.status}"`);
    }

    if (typeof entry.maxComplexity !== "number" || entry.maxComplexity < 0) {
      errors.push(`Agent "${key}" has invalid maxComplexity`);
    }

    if (typeof entry.concurrentTasks !== "number" || entry.concurrentTasks < 1) {
      errors.push(`Agent "${key}" has invalid concurrentTasks`);
    }

    if (typeof entry.capacity !== "number" || entry.capacity <= 0) {
      errors.push(`Agent "${key}" has invalid capacity`);
    }

    if (!entry.expertise) {
      errors.push(`Agent "${key}" missing expertise`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export const AGENT_KEYS = Object.keys(AGENT_REGISTRY) as readonly string[];
export type AgentKey = keyof typeof AGENT_REGISTRY;
