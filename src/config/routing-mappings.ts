/**
 * Routing Mappings — Shared keyword→agent+skill lookup table.
 *
 * Extracted from enforcer-tools.ts to be queryable at runtime
 * by the main AI delegation decision tools.
 */

export interface RoutingMappingEntry {
  keywords: string[];
  skill: string;
  agent: string;
  confidence: number;
}

export const ROUTING_MAPPINGS: RoutingMappingEntry[] = [
  // Core built-in skills (high confidence)
  { keywords: ["write", "file", "create"], skill: "code-review", agent: "code-reviewer", confidence: 0.9 },
  { keywords: ["review", "audit", "assess", "evaluate", "check", "inspect", "quality", "validate", "code-review"], skill: "code-review", agent: "code-reviewer", confidence: 0.9 },
  { keywords: ["test", "testing", "jest", "coverage", "unit", "e2e", "cypress", "spec", "verify"], skill: "testing-strategy", agent: "testing-lead", confidence: 0.95 },
  { keywords: ["fix", "debug", "triage", "broken", "error", "crash", "bug", "issue", "resolve"], skill: "bug-triage", agent: "bug-triage-specialist", confidence: 0.92 },
  { keywords: ["security", "vulnerability", "threat", "scan", "risk", "exploit", "secure", "pentest"], skill: "security-audit", agent: "security-auditor", confidence: 0.95 },
  { keywords: ["refactor", "cleanup", "improve", "restructure", "modernize", "debt"], skill: "refactoring-strategies", agent: "refactorer", confidence: 0.92 },
  { keywords: ["performance", "optimize", "bottleneck", "benchmark", "profile", "speed"], skill: "performance-optimization", agent: "performance-engineer", confidence: 0.93 },
  { keywords: ["frontend", "react", "vue", "angular", "ui", "ux", "interface", "component"], skill: "frontend-development", agent: "frontend-engineer", confidence: 0.95 },
  { keywords: ["backend", "api", "server", "microservice", "endpoint"], skill: "backend-development", agent: "backend-engineer", confidence: 0.95 },
  { keywords: ["docs", "documentation", "readme", "wiki", "guide", "manual"], skill: "documentation-generation", agent: "tech-writer", confidence: 0.9 },
  { keywords: ["database", "db", "sql", "schema", "migration", "query"], skill: "database-design", agent: "database-engineer", confidence: 0.95 },
  { keywords: ["deploy", "ci/cd", "pipeline", "docker", "kubernetes", "infrastructure"], skill: "devops-deployment", agent: "devops-engineer", confidence: 0.94 },
  { keywords: ["mobile", "ios", "android", "react-native", "flutter"], skill: "mobile-development", agent: "mobile-developer", confidence: 0.95 },
  { keywords: ["enforce", "compliance", "rule", "standard", "codex", "block", "prevent"], skill: "code-review", agent: "code-reviewer", confidence: 0.95 },
  { keywords: ["design", "architect", "plan", "system", "model", "pattern", "architecture"], skill: "architecture-patterns", agent: "architect", confidence: 0.95 },
  { keywords: ["codebase", "explore", "research", "discover", "implementation"], skill: "researcher", agent: "researcher", confidence: 0.92 },
  // Additional built-in skill mappings
  { keywords: ["api", "rest", "graphql", "openapi", "endpoint", "swagger"], skill: "api-design", agent: "backend-engineer", confidence: 0.9 },
  { keywords: ["strategy", "roadmap", "planning", "technical", "decision", "architecture"], skill: "architecture-patterns", agent: "strategist", confidence: 0.88 },
  { keywords: ["reflection", "story", "narrative", "saga", "journey", "document"], skill: "storyteller", agent: "tech-writer", confidence: 0.85 },
  { keywords: ["analyze", "metrics", "complexity", "maintainability", "quality"], skill: "code-analyzer", agent: "code-analyzer", confidence: 0.9 },
  { keywords: ["growth", "marketing", "conversion", "acquisition", "user-acquisition"], skill: "growth-strategist", agent: "growth-strategist", confidence: 0.9 },
  { keywords: ["seo", "search", "organic", "traffic", "keywords", "ranking"], skill: "seo-consultant", agent: "seo-consultant", confidence: 0.92 },
  { keywords: ["content", "copy", "blog", "marketing", "social"], skill: "content-creator", agent: "content-creator", confidence: 0.88 },
  { keywords: ["format", "lint", "prettier", "eslint", "style", "formatting"], skill: "auto-format", agent: "code-reviewer", confidence: 0.85 },
  { keywords: ["project", "structure", "health", "dependencies", "architecture"], skill: "project-analysis", agent: "architect", confidence: 0.88 },
  { keywords: ["compliance", "audit", "standards", "framework", "validation"], skill: "framework-compliance-audit", agent: "code-reviewer", confidence: 0.9 },
  { keywords: ["session", "state", "persistence", "storage", "cache"], skill: "session-management", agent: "backend-engineer", confidence: 0.85 },
  { keywords: ["image", "visual", "pdf", "diagram", "multimedia", "media"], skill: "multimodal-looker", agent: "multimodal-looker", confidence: 0.92 },
  { keywords: ["testing", "strategy", "coverage", "test-plan"], skill: "testing-strategy", agent: "testing-lead", confidence: 0.92 },
  { keywords: ["inference", "model", "llm", "tuning", "optimization"], skill: "inference-improve", agent: "performance-engineer", confidence: 0.88 },
  { keywords: ["orchestrate", "boot", "initialize", "startup", "bootstrap"], skill: "boot-orchestrator", agent: "architect", confidence: 0.9 },
  // Additional unmapped skills
  { keywords: ["tool", "utility", "helper", "instrument"], skill: "architect-tools", agent: "architect", confidence: 0.85 },
  { keywords: ["design", "visual", "style", "theme", "css", "accessibility"], skill: "ui-ux-design", agent: "frontend-ui-ux-engineer", confidence: 0.9 },
  { keywords: ["agent", "multi-agent", "coordination", "hermes", "communication"], skill: "hermes-agent", agent: "architect", confidence: 0.88 },
  { keywords: ["log", "diagnostic", "trace", "monitor", "watch"], skill: "log-monitor", agent: "log-monitor", confidence: 0.9 },
  { keywords: ["health", "diagnostic", "model-health", "validate-llm"], skill: "model-health-check", agent: "performance-engineer", confidence: 0.88 },
  { keywords: ["profiling", "memory", "cpu", "latency"], skill: "performance-analysis", agent: "performance-engineer", confidence: 0.9 },
  { keywords: ["pipeline", "stream", "etl", "batch", "process"], skill: "processor-pipeline", agent: "backend-engineer", confidence: 0.88 },
  { keywords: ["vulnerability", "cve", "sast", "dast", "dependency-check"], skill: "security-scan", agent: "security-auditor", confidence: 0.92 },
  { keywords: ["state", "store", "redux", "context", "persistence"], skill: "state-manager", agent: "backend-engineer", confidence: 0.88 },

  // Community Skills (optional, lower confidence)
  { keywords: ["theme", "design-system", "color", "font", "typography", "palette"], skill: "antigravity--theme-factory", agent: "frontend-ui-ux-engineer", confidence: 0.6 },
  { keywords: ["hig", "salesforce design", "lightning design", "slds"], skill: "antigravity--hig-components-system", agent: "frontend-ui-ux-engineer", confidence: 0.65 },
  { keywords: ["slide", "deck", "presentation", "powerpoint"], skill: "antigravity--theme-factory", agent: "content-creator", confidence: 0.55 },
  { keywords: ["seo technical", "crawl", "indexability", "core web vitals", "sitemap"], skill: "antigravity--seo-technical", agent: "seo-consultant", confidence: 0.7 },
  { keywords: ["seo structure", "content hierarchy", "schema", "internal linking"], skill: "antigravity--seo-structure-architect", agent: "seo-consultant", confidence: 0.7 },
  { keywords: ["seo snippet", "meta description", "title tag"], skill: "antigravity--seo-snippet-hunter", agent: "seo-consultant", confidence: 0.7 },
  { keywords: ["seo hreflang", "international seo", "multilingual"], skill: "antigravity--seo-hreflang", agent: "seo-consultant", confidence: 0.65 },
  { keywords: ["backend security", "secure coding", "input validation", "authentication"], skill: "antigravity--backend-security-coder", agent: "security-auditor", confidence: 0.7 },
  { keywords: ["mobile security", "ios security", "android security"], skill: "antigravity--mobile-security-coder", agent: "security-auditor", confidence: 0.65 },
  { keywords: ["security audit", "vulnerability assessment", "penetration test"], skill: "security-audit", agent: "security-auditor", confidence: 0.75 },
  { keywords: ["vector", "embeddings", "similarity search", "pinecone", "qdrant", "chroma"], skill: "antigravity--vector-database-engineer", agent: "database-engineer", confidence: 0.65 },
  { keywords: ["similarity search", "approximate nearest neighbor"], skill: "antigravity--similarity-search-patterns", agent: "database-engineer", confidence: 0.65 },
  { keywords: ["svelte", "sveltekit", "svelte.js"], skill: "antigravity--sveltekit", agent: "frontend-engineer", confidence: 0.65 },
  { keywords: ["trpc", "typescript rpc", "tRPC"], skill: "antigravity--trpc-fullstack", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["vercel ai", "ai sdk", "vapi"], skill: "antigravity--vercel-ai-sdk-expert", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["threejs", "3d web", "webgl", "3d graphics"], skill: "antigravity--threejs-loaders", agent: "frontend-engineer", confidence: 0.6 },
  { keywords: ["comfyui", "ai image generation", "stable diffusion"], skill: "antigravity--comfyui-gateway", agent: "multimodal-looker", confidence: 0.6 },
  { keywords: ["swiftui", "ios development"], skill: "antigravity--swiftui-liquid-glass", agent: "mobile-developer", confidence: 0.7 },
  { keywords: ["ios performance", "swift optimization"], skill: "antigravity--swiftui-performance-audit", agent: "mobile-developer", confidence: 0.65 },
  { keywords: ["react native", "rn"], skill: "mobile-development", agent: "mobile-developer", confidence: 0.7 },
  { keywords: ["golang", "go", "gopher"], skill: "antigravity--golang-pro", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["temporal", "workflow", " durable execution"], skill: "antigravity--temporal-golang-pro", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["python async", "asyncio", "uvloop"], skill: "antigravity--async-python-patterns", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["pydantic", "data validation", "python models"], skill: "antigravity--pydantic-models-py", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["scala", "spark", "big data"], skill: "antigravity--scala-pro", agent: "backend-engineer", confidence: 0.6 },
  { keywords: ["dotnet", "c#", ".net"], skill: "antigravity--dotnet-backend-patterns", agent: "backend-engineer", confidence: 0.6 },
  { keywords: ["azure", "azd", "azure deploy"], skill: "antigravity--azd-deployment", agent: "devops-engineer", confidence: 0.65 },
  { keywords: ["azure storage", "file share"], skill: "antigravity--azure-storage-file-share-ts", agent: "devops-engineer", confidence: 0.6 },
  { keywords: ["azure service bus", "messaging"], skill: "antigravity--azure-servicebus-py", agent: "devops-engineer", confidence: 0.6 },
  { keywords: ["discord bot", "discord automation"], skill: "antigravity--discord-bot-architect", agent: "backend-engineer", confidence: 0.6 },
  { keywords: ["n8n", "workflow automation"], skill: "antigravity--n8n-expression-syntax", agent: "devops-engineer", confidence: 0.6 },
  { keywords: ["linkedin automation", "social posting"], skill: "antigravity--linkedin-automation", agent: "growth-strategist", confidence: 0.55 },
  { keywords: ["reddit automation"], skill: "antigravity--reddit-automation", agent: "growth-strategist", confidence: 0.55 },
  { keywords: ["freshdesk", "customer support automation"], skill: "antigravity--freshdesk-automation", agent: "devops-engineer", confidence: 0.55 },
  { keywords: ["pagerduty", "incident management"], skill: "antigravity--pagerduty-automation", agent: "devops-engineer", confidence: 0.55 },
  { keywords: ["local llm", "ollama", "llama", "local model"], skill: "antigravity--local-llm-expert", agent: "performance-engineer", confidence: 0.65 },
  { keywords: ["mcp", "model context protocol"], skill: "antigravity--agent-memory-mcp", agent: "architect", confidence: 0.65 },
  { keywords: ["agent evaluation", "agent testing"], skill: "antigravity--agent-evaluation", agent: "testing-lead", confidence: 0.65 },
  { keywords: ["ai agent", "autonomous agent"], skill: "antigravity--ai-agent-development", agent: "backend-engineer", confidence: 0.65 },
  { keywords: ["marketing content", "ad creative", "campaign"], skill: "antigravity--marketing-ideas", agent: "content-creator", confidence: 0.6 },
  { keywords: ["conversion", "cro", "optimization"], skill: "antigravity--onboarding-cro", agent: "growth-strategist", confidence: 0.6 },
  { keywords: ["code documentation", "code explain", "explain code"], skill: "antigravity--code-documentation-code-explain", agent: "tech-writer", confidence: 0.65 },
  { keywords: ["code refactoring", "clean code"], skill: "antigravity--code-refactoring-refactor-clean", agent: "refactorer", confidence: 0.65 },
  { keywords: ["code review checklist"], skill: "antigravity--code-review-checklist", agent: "code-reviewer", confidence: 0.7 },
  { keywords: ["microservices", "service mesh", "distributed systems"], skill: "antigravity--microservices-patterns", agent: "architect", confidence: 0.65 },
  { keywords: ["architecture decision", "adr", "decision records"], skill: "antigravity--architecture-decision-records", agent: "architect", confidence: 0.65 },
  { keywords: ["context management", "context compression", "token optimization"], skill: "antigravity--context-compression", agent: "performance-engineer", confidence: 0.65 },
  { keywords: ["context guardian", "memory safety"], skill: "antigravity--context-guardian", agent: "performance-engineer", confidence: 0.6 },
  { keywords: ["context fundamentals"], skill: "antigravity--context-fundamentals", agent: "performance-engineer", confidence: 0.6 },
  { keywords: ["interview", "technical interview", "coding interview"], skill: "antigravity--interview-coach", agent: "growth-strategist", confidence: 0.6 },
  { keywords: ["i18n", "localization", "translation"], skill: "antigravity--i18n-localization", agent: "frontend-engineer", confidence: 0.6 },
  { keywords: ["accessibility", "a11y", "wcag"], skill: "antigravity--accessibility-compliance-accessibility-audit", agent: "frontend-ui-ux-engineer", confidence: 0.7 },
  { keywords: ["pwa", "progressive web app"], skill: "antigravity--progressive-web-app", agent: "frontend-engineer", confidence: 0.6 },
  { keywords: ["data migration", "sql migration"], skill: "antigravity--database-migrations-sql-migrations", agent: "database-engineer", confidence: 0.65 },
  { keywords: ["request code review", "pr review", "pull request"], skill: "superpowers--requesting-code-review", agent: "code-reviewer", confidence: 0.7 },
];

export interface RoutingMatch {
  agent: string;
  skill: string;
  confidence: number;
  matchedKeywords: string[];
}

export function queryRoutingMappings(keywords: string[]): RoutingMatch[] {
  const descLower = keywords.join(" ").toLowerCase();
  const matches: RoutingMatch[] = [];

  for (const mapping of ROUTING_MAPPINGS) {
    const matched: string[] = [];
    for (const kw of mapping.keywords) {
      if (descLower.includes(kw.toLowerCase())) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      matches.push({
        agent: mapping.agent,
        skill: mapping.skill,
        confidence: mapping.confidence,
        matchedKeywords: matched,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return matches;
}

export function getAllRoutingMappings(): RoutingMappingEntry[] {
  return ROUTING_MAPPINGS;
}
