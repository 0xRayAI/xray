/**
 * Task-Skill Router for StringRay
 *
 * Pre-processor utility for intelligent task-to-agent/skill routing.
 * Complements the AgentDelegator by providing keyword-based preprocessing
 * that feeds into the complexity-based delegation system.
 *
 * @version 1.1.0
 * @since 2026-02-22
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { StringRayStateManager } from "../state/state-manager.js";

/**
 * Keyword to skill/agent mapping
 * Ordered by specificity - more specific keywords must come first
 */
const TASK_KEYWORD_MAPPINGS = [
  // ===== ULTIMATE PRIORITY: Language-specific (must be first) =====
  // Rust (before TypeScript - "traits", "borrow" are Rust-specific)
  {
    keywords: ["rust", "rustlang", "cargo", "traits", "borrow checker", "rustacean", "derive macro"],
    skill: "rust-patterns",
    agent: "performance-engineer",
    confidence: 0.99,
  },
  // TypeScript (before bug/fix catches "error")
  {
    keywords: ["typescript", " ts ", " ts,", " ts.", "type error", "type safety", "type system"],
    skill: "typescript-expert",
    agent: "code-reviewer",
    confidence: 0.98,
  },
  // Python (before API catches)
  {
    keywords: ["python", "django", "flask", "fastapi", "pandas", "numpy", "pytorch"],
    skill: "python-patterns",
    agent: "backend-engineer",
    confidence: 0.99,
  },
  // Docker (before API catches)
  {
    keywords: ["docker", "dockerfile", "containerize", "docker-compose"],
    skill: "docker-expert",
    agent: "devops-engineer",
    confidence: 0.99,
  },
  // Vercel (before deployment catches)
  {
    keywords: ["vercel", "vercel deployment", "vercel deploy"],
    skill: "vercel-deployment",
    agent: "devops-engineer",
    confidence: 0.99,
  },
  // ===== END ULTIMATE PRIORITY =====

  // ===== NEW: Antigravity Skills (high priority) =====
  // Rust (before TypeScript to avoid "ts" matching)
  {
    keywords: ["rust", "rustlang", "cargo", "traits", "borrow checker", "rustacean"],
    skill: "rust-patterns",
    agent: "performance-engineer",
    confidence: 0.98,
  },
  // Go
  {
    keywords: ["golang", " go ", " go,", "goroutine", "goroutines", "channel", "gopher"],
    skill: "go-patterns",
    agent: "backend-engineer",
    confidence: 0.98,
  },
  // Copywriting
  {
    keywords: ["copywriting", "marketing copy", "landing page copy", "headline", "advertising copy", "cta copy"],
    skill: "copywriting",
    agent: "marketing-expert",
    confidence: 0.98,
  },
  // Pricing strategy
  {
    keywords: ["pricing strategy", "saas pricing", "monetization", "pricing model", "price optimization"],
    skill: "pricing-strategy",
    agent: "marketing-expert",
    confidence: 0.98,
  },
  // RAG
  {
    keywords: ["rag", "vector database", "embedding", "chunking", "retrieval", "vector db", "pinecone", "weaviate", "chroma"],
    skill: "rag-engineer",
    agent: "librarian",
    confidence: 0.98,
  },
  // Prompt Engineering
  {
    keywords: ["prompt engineering", "prompt-optimization", "few-shot", "chain-of-thought"],
    skill: "prompt-engineering",
    agent: "librarian",
    confidence: 0.98,
  },
  // ===== END Antigravity Skills =====

  // Security (highest priority - specific domain)
  {
    keywords: [
      "security",
      "vulnerability",
      "audit",
      "credential",
      "encrypt",
      "sanitize",
    ],
    skill: "security-audit",
    agent: "security-auditor",
    confidence: 0.95,
  },
  // Testing - specific methodologies
  {
    keywords: [
      "tdd",
      "bdd",
      "test coverage",
      "test strategy",
      "unit test",
      "integration test",
      "e2e",
      "behavior test",
    ],
    skill: "testing-best-practices",
    agent: "test-architect",
    confidence: 0.95,
  },
  // Testing - general
  {
    keywords: ["test", "testing", "spec", "mock", "stub"],
    skill: "testing-strategy",
    agent: "test-architect",
    confidence: 0.9,
  },
  // Refactoring - specific patterns
  {
    keywords: ["refactor", "technical debt", "code smell", "consolidate"],
    skill: "refactoring-strategies",
    agent: "refactorer",
    confidence: 0.9,
  },
  // Performance - specific
  {
    keywords: [
      "bottleneck",
      "memory leak",
      "cpu usage",
      "latency",
      "throughput",
    ],
    skill: "performance-optimization",
    agent: "refactorer",
    confidence: 0.9,
  },
  // Performance - general
  {
    keywords: ["performance", "optimize", "slow", "speed"],
    skill: "performance-optimization",
    agent: "refactorer",
    confidence: 0.8,
  },
  // Code Review - specific
  {
    keywords: ["code quality", "lint", "style guide", "best practice"],
    skill: "code-review",
    agent: "code-reviewer",
    confidence: 0.9,
  },
  // Code Review - general
  {
    keywords: ["review", "quality check"],
    skill: "code-review",
    agent: "code-reviewer",
    confidence: 0.85,
  },
  // Frontend/UI - more specific first
  {
    keywords: ["design system", "component library", "ui component"],
    skill: "ui-ux-design",
    agent: "enforcer", // Routes to enforcer which delegates appropriately
    confidence: 0.85,
  },
  // Frontend/UI - general
  {
    keywords: [
      "ui",
      "frontend",
      "css",
      "button",
      "form",
      "modal",
      "page",
      "interface",
    ],
    skill: "ui-ux-design",
    agent: "enforcer",
    confidence: 0.75,
  },
  // Architecture - specific
  {
    keywords: ["system architecture", "microservice", "distributed system"],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.95,
  },
  // Architecture - general
  {
    keywords: ["architect", "architecture", "structure", "pattern"],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.85,
  },
  // API/Backend - specific
  {
    keywords: ["rest api", "graphql", "endpoint", "route handler"],
    skill: "api-design",
    agent: "architect",
    confidence: 0.9,
  },
  // API/Backend - general
  {
    keywords: ["api", "backend", "server", "crud"],
    skill: "api-design",
    agent: "architect",
    confidence: 0.8,
  },
  // Database - specific
  {
    keywords: ["database schema", "sql", "migration", "query optimization"],
    skill: "database-design",
    agent: "architect",
    confidence: 0.9,
  },
  // Documentation - specific FIRST (before generic "doc" matches everything)
  {
    keywords: ["readme", "changelog", "api documentation", "markdown"],
    skill: "documentation-generation",
    agent: "librarian",
    confidence: 0.9,
  },
  // DevOps/Deployment - specific BEFORE generic (docker before pipeline)
  {
    keywords: [
      "deploy",
      "docker",
      "kubernetes",
      "ci/cd",
      "pipeline",
      "release",
    ],
    skill: "devops-deployment",
    agent: "architect",
    confidence: 0.85,
  },
  // Documentation - general (now comes after specific but BEFORE architecture to avoid "doc" matching "architect")
  {
    keywords: ["document", "doc", "comment", "guide", "tutorial"],
    skill: "documentation-generation",
    agent: "librarian",
    confidence: 0.8,
  },
  // Architecture - specific (comes after documentation to avoid "doc" substring match)
  {
    keywords: ["system architecture", "microservice", "distributed system"],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.95,
  },
  // Architecture - general (moved AFTER specific to avoid premature matching)
  {
    keywords: ["architect", "architecture", "structure", "pattern"],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.85,
  },
  // Bug fixing - specific patterns
  {
    keywords: ["debug", "stack trace", "exception", "crash", "panic"],
    skill: "code-review",
    agent: "bug-triage-specialist",
    confidence: 0.9,
  },
  // Bug fixing - general (lower priority than language-specific)
  {
    keywords: ["bug", "fix", "issue", "problem", "fail"],
    skill: "code-review",
    agent: "bug-triage-specialist",
    confidence: 0.7,
  },
  // Project analysis - specific
  {
    keywords: ["code complexity", "maintainability", "cyclomatic"],
    skill: "project-analysis",
    agent: "librarian",
    confidence: 0.95,
  },
  // Project analysis - general
  {
    keywords: ["analyze", "structure", "health", "metrics", "dependencies"],
    skill: "project-analysis",
    agent: "librarian",
    confidence: 0.85,
  },
  // State management
  {
    keywords: [
      "state",
      "store",
      "redux",
      "mobx",
      "context",
      "cache",
      "persistence",
    ],
    skill: "state-manager",
    agent: "architect",
    confidence: 0.85,
  },
  // Session management
  {
    keywords: ["session", "cookie", "token", "jwt", "auth", "login", "logout"],
    skill: "session-management",
    agent: "architect",
    confidence: 0.85,
  },
  // Git workflow
  {
    keywords: [
      "git",
      "commit",
      "branch",
      "merge",
      "pr",
      "pull request",
      "rebase",
      "conflict",
    ],
    skill: "git-workflow",
    agent: "librarian",
    confidence: 0.9,
  },
  // Boot/orchestration
  {
    keywords: ["boot", "init", "startup", "initialize", "setup", "config"],
    skill: "boot-orchestrator",
    agent: "architect",
    confidence: 0.9,
  },
  // Processing pipeline
  {
    keywords: ["pipeline", "batch", "stream", "transform", "filter", "etl"],
    skill: "processor-pipeline",
    agent: "architect",
    confidence: 0.85,
  },
  // SEO - specific
  {
    keywords: ["seo", "search engine", "keyword", "meta", "ranking", "google"],
    skill: "seo-specialist",
    agent: "seo-specialist",
    confidence: 0.95,
  },
  // Marketing - specific
  {
    keywords: ["marketing", "campaign", "brand", "growth", "conversion", "cta"],
    skill: "marketing-expert",
    agent: "marketing-expert",
    confidence: 0.9,
  },
  // Copywriting - specific
  {
    keywords: ["copywriting", "landing page", "headline", "marketing copy", "advertising"],
    skill: "seo-copywriter",
    agent: "seo-copywriter",
    confidence: 0.95,
  },
  // Code analysis - specific
  {
    keywords: ["code analysis", "metrics", "complexity", "code smell", "technical debt"],
    skill: "code-analyzer",
    agent: "analyzer",
    confidence: 0.9,
  },
  // Log monitoring - specific
  {
    keywords: ["log", "logging", "monitor", "alert", "observability"],
    skill: "log-monitor",
    agent: "log-monitor",
    confidence: 0.9,
  },
  // Visual analysis - specific
  {
    keywords: ["screenshot", "diagram", "image", "visual", "mockup", "ui design"],
    skill: "multimodal-looker",
    agent: "multimodal-looker",
    confidence: 0.85,
  },
  // Docker - specific (before DevOps to ensure higher priority)
  {
    keywords: ["docker", "container", "dockerfile", "kubernetes", "k8s"],
    skill: "docker-expert",
    agent: "devops-engineer",
    confidence: 0.9,
  },
  // TypeScript/JavaScript - maps to code-reviewer
  {
    keywords: ["typescript", "javascript", "js", "ts", "type error", "type safety"],
    skill: "typescript-expert",
    agent: "code-reviewer",
    confidence: 0.85,
  },
  // Python - maps to backend-engineer (for API work)
  {
    keywords: ["python", "django", "flask", "fastapi", "pandas"],
    skill: "python-patterns",
    agent: "backend-engineer",
    confidence: 0.8,
  },
  // React - maps to frontend-engineer
  {
    keywords: ["react", "jsx", "tsx", "hooks", "component", "state"],
    skill: "react-patterns",
    agent: "frontend-engineer",
    confidence: 0.85,
  },
  // Go - maps to backend-engineer
  {
    keywords: ["golang", " go ", "goroutine", "channel"],
    skill: "go-patterns",
    agent: "backend-engineer",
    confidence: 0.8,
  },
  // Rust - maps to performance-engineer
  {
    keywords: ["rust", "rustlang", "cargo", "trait", "borrow checker"],
    skill: "rust-patterns",
    agent: "performance-engineer",
    confidence: 0.8,
  },
  // AWS/Serverless - maps to devops-engineer
  {
    keywords: ["aws", "lambda", "serverless", "s3", "dynamodb", "cloudformation"],
    skill: "aws-serverless",
    agent: "devops-engineer",
    confidence: 0.85,
  },
  // Vercel - maps to devops-engineer
  {
    keywords: ["vercel", "next.js", "edge", "deployment"],
    skill: "vercel-deployment",
    agent: "devops-engineer",
    confidence: 0.85,
  },
  // Vulnerability scanning - maps to security-auditor
  {
    keywords: ["vulnerability", "cve", "exploit", "penetration", "security scan"],
    skill: "vulnerability-scanner",
    agent: "security-auditor",
    confidence: 0.9,
  },
  // API Security - maps to security-auditor
  {
    keywords: ["api security", "authentication", "authorization", "jwt", "oauth"],
    skill: "api-security-best-practices",
    agent: "security-auditor",
    confidence: 0.9,
  },
  // Pricing strategy - maps to marketing-expert
  {
    keywords: ["pricing", "pricing strategy", "monetization", "saas pricing"],
    skill: "pricing-strategy",
    agent: "marketing-expert",
    confidence: 0.9,
  },
  // SEO Fundamentals - maps to seo-specialist
  {
    keywords: ["seo audit", "search engine", "web vitals", "core web vitals"],
    skill: "seo-fundamentals",
    agent: "seo-specialist",
    confidence: 0.9,
  },
  // RAG Engineer - HIGH PRIORITY (before generic "analyze")
  {
    keywords: ["rag", "vector database", "embedding", "chunking", "retrieval", "vector db", "pinecone", "weaviate", "chroma"],
    skill: "rag-engineer",
    agent: "librarian",
    confidence: 0.95,
  },
  // Prompt Engineering - HIGH PRIORITY (before generic words)
  {
    keywords: ["prompt engineering", "prompt-optimization", "few-shot", "chain-of-thought"],
    skill: "prompt-engineering",
    agent: "librarian",
    confidence: 0.95,
  },
  // Pricing strategy - HIGH PRIORITY
  {
    keywords: ["pricing strategy", "saas pricing", "monetization", "pricing model", "price optimization"],
    skill: "pricing-strategy",
    agent: "marketing-expert",
    confidence: 0.95,
  },
  // Copywriting - HIGH PRIORITY
  {
    keywords: ["copywriting", "marketing copy", "landing page copy", "headline", "advertising copy", "cta copy"],
    skill: "copywriting",
    agent: "marketing-expert",
    confidence: 0.95,
  },
  // Rust - HIGH PRIORITY (before typescript)
  {
    keywords: ["rust", "rustlang", "cargo", "traits", "borrow checker", "rustacean"],
    skill: "rust-patterns",
    agent: "performance-engineer",
    confidence: 0.95,
  },
  // Go - HIGH PRIORITY  
  {
    keywords: ["golang", " go ", "go ", " goroutine", "goroutines", "channel", "gopher"],
    skill: "go-patterns",
    agent: "backend-engineer",
    confidence: 0.95,
  },
  // RAG Engineer - maps to librarian
  {
    keywords: ["rag", "vector database", "embedding", "chunking", "retrieval"],
    skill: "rag-engineer",
    agent: "librarian",
    confidence: 0.85,
  },
  // Prompt Engineering - maps to librarian (for now)
  {
    keywords: ["prompt", "prompt engineering", "llm", "few-shot"],
    skill: "prompt-engineering",
    agent: "librarian",
    confidence: 0.8,
  },
  // Brainstorming - maps to architect
  {
    keywords: ["brainstorm", "ideate", "design thinking", "workshop"],
    skill: "brainstorming",
    agent: "architect",
    confidence: 0.85,
  },
  // Planning - maps to architect
  {
    keywords: ["plan", "roadmap", "milestone", "sprint planning"],
    skill: "planning",
    agent: "architect",
    confidence: 0.85,
  },
];

/**
 * Routing result interface
 */
export interface RoutingResult {
  skill: string;
  agent: string;
  confidence: number;
  matchedKeyword?: string;
  fromHistory?: boolean;
  reason?: string;
  operation?: string; // For AgentDelegator integration
  context?: Record<string, unknown>; // Extracted context for delegation
}

/**
 * Routing options
 */
export interface RoutingOptions {
  complexity?: number;
  taskId?: string;
  useHistoricalData?: boolean;
  sessionId?: string;
  stateManager?: StringRayStateManager;
}

/**
 * TaskSkillRouter class
 * Provides intelligent routing based on keywords, history, and complexity
 * Designed as a PRE-PROCESSOR to AgentDelegator, not a replacement
 */
export class TaskSkillRouter {
  private mappings = [...TASK_KEYWORD_MAPPINGS];
  private stateManager: StringRayStateManager | undefined;

  // In-memory cache for immediate access (persisted via stateManager)
  private routingHistoryCache: Map<
    string,
    {
      taskId: string;
      agent: string;
      skill: string;
      totalAttempts: number;
      successCount: number;
    }
  > = new Map();

  constructor(stateManager?: StringRayStateManager) {
    if (stateManager) {
      this.stateManager = stateManager;
      this.loadHistory();
    }
  }

  /**
   * Set state manager after construction
   */
  setStateManager(stateManager: StringRayStateManager): void {
    this.stateManager = stateManager;
    this.loadHistory();
  }

  /**
   * Load routing history from state manager
   */
  private loadHistory(): void {
    if (!this.stateManager) return;

    try {
      const history = this.stateManager.get("routing_history") as
        | Record<string, unknown>
        | undefined;
      if (history) {
        for (const [taskId, data] of Object.entries(history)) {
          const entry = data as {
            taskId: string;
            agent: string;
            skill: string;
            totalAttempts: number;
            successCount: number;
          };
          this.routingHistoryCache.set(taskId, entry);
        }
      }
    } catch (error) {
      frameworkLogger.log(
        "task-skill-router",
        "history-load-failed",
        "debug",
        { error: String(error) },
        undefined,
      );
    }
  }

  /**
   * Save routing history to state manager
   */
  private saveHistory(): void {
    if (!this.stateManager) return;

    try {
      const history: Record<string, unknown> = {};
      for (const [taskId, data] of this.routingHistoryCache) {
        history[taskId] = data;
      }
      this.stateManager.set("routing_history", history);
    } catch (error) {
      frameworkLogger.log(
        "task-skill-router",
        "history-save-failed",
        "debug",
        { error: String(error) },
        undefined,
      );
    }
  }

  /**
   * Pre-process a task description to extract operation and context
   * This is the main integration point with AgentDelegator
   */
  preprocess(
    taskDescription: string,
    options: RoutingOptions = {},
  ): {
    operation: string;
    context: Record<string, unknown>;
    routing: RoutingResult;
  } {
    const result = this.routeTask(taskDescription, options);

    // Convert routing result to operation and context for AgentDelegator
    const operation = this.skillToOperation(result.skill);
    const context: Record<string, unknown> = {
      ...result.context,
      suggestedSkill: result.skill,
      suggestedAgent: result.agent,
      routingConfidence: result.confidence,
      routingReason: result.reason,
    };

    return {
      operation,
      context,
      routing: result,
    };
  }

  /**
   * Route a task to the appropriate agent and skill
   */
  routeTask(
    taskDescription: string,
    options: RoutingOptions = {},
  ): RoutingResult {
    const { complexity, taskId, useHistoricalData = true } = options;

    if (!taskDescription || typeof taskDescription !== "string") {
      return this.getDefaultRouting("Invalid task description");
    }

    const descLower = taskDescription.toLowerCase();

    // 1. Try keyword matching first (highest priority)
    const keywordResult = this.matchByKeywords(descLower);
    if (keywordResult) {
      frameworkLogger.log(
        "task-skill-router",
        "keyword-matched",
        "debug",
        {
          taskDescription: taskDescription.substring(0, 100),
          matchedKeyword: keywordResult.matchedKeyword,
          agent: keywordResult.agent,
          skill: keywordResult.skill,
        },
        options.sessionId,
      );
      return keywordResult;
    }

    // 2. Try historical data
    if (useHistoricalData && taskId) {
      const historyResult = this.matchByHistory(taskId);
      if (historyResult) {
        frameworkLogger.log(
          "task-skill-router",
          "history-matched",
          "debug",
          { taskId, agent: historyResult.agent },
          options.sessionId,
        );
        return historyResult;
      }
    }

    // 3. Try complexity-based routing
    if (complexity !== undefined) {
      const complexityResult = this.matchByComplexity(complexity);
      if (complexityResult) {
        return complexityResult;
      }
    }

    // Default fallback - use enforcer as per codex
    return this.getDefaultRouting("No keyword match found");
  }

  /**
   * Match task by keywords (ordered by specificity)
   */
  private matchByKeywords(descLower: string): RoutingResult | null {
    for (const mapping of this.mappings) {
      for (const keyword of mapping.keywords) {
        if (descLower.includes(keyword.toLowerCase())) {
          return {
            skill: mapping.skill,
            agent: mapping.agent,
            confidence: mapping.confidence,
            matchedKeyword: keyword,
            reason: `Matched keyword: ${keyword}`,
          };
        }
      }
    }
    return null;
  }

  /**
   * Match task by historical routing data
   */
  private matchByHistory(taskId: string): RoutingResult | null {
    const historyEntry = this.routingHistoryCache.get(taskId);
    if (historyEntry && historyEntry.totalAttempts > 0) {
      const successRate =
        historyEntry.successCount / historyEntry.totalAttempts;
      if (successRate >= 0.7) {
        return {
          skill: historyEntry.skill,
          agent: historyEntry.agent,
          confidence: 0.75,
          fromHistory: true,
          reason: `Historical success with ${historyEntry.agent} (${Math.round(successRate * 100)}% success rate)`,
        };
      }
    }
    return null;
  }

  /**
   * Match task by complexity score (fallback)
   */
  private matchByComplexity(complexity: number): RoutingResult | null {
    if (complexity <= 25) {
      return {
        skill: "code-review",
        agent: "code-reviewer",
        confidence: 0.6,
        reason: "Low complexity - direct agent",
      };
    } else if (complexity <= 95) {
      return {
        skill: "architecture-patterns",
        agent: "architect",
        confidence: 0.6,
        reason: "Medium complexity - architect review",
      };
    } else {
      return {
        skill: "orchestrator",
        agent: "orchestrator",
        confidence: 0.7,
        reason: "High complexity - orchestrator needed",
      };
    }
  }

  /**
   * Get default routing (enforcer per codex)
   */
  private getDefaultRouting(reason: string): RoutingResult {
    return {
      skill: "code-review",
      agent: "enforcer", // Per codex - enforcer is central coordinator
      confidence: 0.5,
      reason,
    };
  }

  /**
   * Convert skill name to operation type for AgentDelegator
   */
  private skillToOperation(skill: string): string {
    const skillToOperationMap: Record<string, string> = {
      "security-audit": "security",
      "testing-strategy": "test",
      "testing-best-practices": "test",
      "refactoring-strategies": "refactor",
      "performance-optimization": "optimize",
      "code-review": "review",
      "ui-ux-design": "design",
      "architecture-patterns": "design",
      "api-design": "design",
      "database-design": "design",
      "documentation-generation": "document",
      "project-analysis": "analyze",
      "state-manager": "configure",
      "session-management": "configure",
      "git-workflow": "manage",
      "boot-orchestrator": "initialize",
      "devops-deployment": "deploy",
      "processor-pipeline": "process",
    };
    return skillToOperationMap[skill] || "analyze";
  }

  /**
   * Get the skill name for a given agent
   */
  getSkillForAgent(agent: string): string {
    const mapping = this.mappings.find((m) => m.agent === agent);
    return mapping ? mapping.skill : "unknown";
  }

  /**
   * Track routing result for learning
   */
  trackResult(taskId: string, agent: string, success: boolean): void {
    if (!this.routingHistoryCache.has(taskId)) {
      this.routingHistoryCache.set(taskId, {
        taskId,
        agent,
        skill: this.getSkillForAgent(agent),
        totalAttempts: 0,
        successCount: 0,
      });
    }

    const entry = this.routingHistoryCache.get(taskId)!;
    entry.totalAttempts++;
    if (success) {
      entry.successCount++;
    }

    // Persist to state manager
    this.saveHistory();

    frameworkLogger.log(
      "task-skill-router",
      "result-tracked",
      "debug",
      {
        taskId,
        agent,
        success,
        successRate: entry.successCount / entry.totalAttempts,
      },
      undefined,
    );
  }

  /**
   * Get routing statistics
   */
  getStats(): Record<
    string,
    { attempts: number; successes: number; successRate: number }
  > {
    const stats: Record<
      string,
      { attempts: number; successes: number; successRate: number }
    > = {};

    for (const [, data] of this.routingHistoryCache) {
      const key = `${data.agent}:${data.skill}`;
      if (!stats[key]) {
        stats[key] = { attempts: 0, successes: 0, successRate: 0 };
      }
      stats[key].attempts += data.totalAttempts;
      stats[key].successes += data.successCount;
      stats[key].successRate =
        data.totalAttempts > 0 ? data.successCount / data.totalAttempts : 0;
    }
    return stats;
  }

  /**
   * Add custom keyword mapping
   */
  addMapping(
    keywords: string | string[],
    skill: string,
    agent: string,
    confidence = 0.8,
  ): void {
    const newMapping = {
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      skill,
      agent,
      confidence,
    };
    this.mappings.push(newMapping);
  }

  /**
   * Get all available mappings (for debugging/testing)
   */
  getMappings(): Array<{
    keywords: string[];
    skill: string;
    agent: string;
    confidence: number;
  }> {
    return [...this.mappings];
  }
}

// Default instance (without state manager - must be set separately)
export const taskSkillRouter = new TaskSkillRouter();

// Factory function for creating with state manager
export function createTaskSkillRouter(
  stateManager?: StringRayStateManager,
): TaskSkillRouter {
  return new TaskSkillRouter(stateManager);
}

// Convenience function for one-off routing
export function routeTaskToAgent(
  taskDescription: string,
  options?: RoutingOptions,
): RoutingResult {
  return taskSkillRouter.routeTask(taskDescription, options);
}

// Convenience function for preprocessing (recommended for AgentDelegator integration)
export function preprocessTask(
  taskDescription: string,
  options?: RoutingOptions,
): {
  operation: string;
  context: Record<string, unknown>;
  routing: RoutingResult;
} {
  return taskSkillRouter.preprocess(taskDescription, options);
}
