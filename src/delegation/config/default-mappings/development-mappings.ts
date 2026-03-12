/**
 * Development Mappings
 *
 * Maps development-related tasks to various engineering agents.
 * Includes refactoring, code review, frontend, and backend development.
 */

import type { RoutingMapping } from '../types.js';

export const DEVELOPMENT_MAPPINGS: RoutingMapping[] = [
  // ===== Refactoring =====
  {
    keywords: [
      "refactor", "technical debt", "code smell", "consolidate",
      "clean up code", "clean code", "improve code", "code cleanup",
      "simplify code", "simplify", "reduce complexity", "optimize code",
      "reorganize", "restructure", "modernize", "update code",
      "legacy code", "improve maintainability", "code quality",
    ],
    skill: "refactoring-strategies",
    agent: "refactorer",
    confidence: 0.92,
    category: "development",
    priority: "high",
  },

  // ===== Code Review =====
  {
    keywords: ["code quality", "lint", "style guide", "best practice"],
    skill: "code-review",
    agent: "code-reviewer",
    confidence: 0.9,
    category: "development",
    priority: "high",
  },
  {
    keywords: ["review", "quality check"],
    skill: "code-review",
    agent: "code-reviewer",
    confidence: 0.85,
    category: "development",
    priority: "medium",
  },

  // ===== Bug fixing =====
  {
    keywords: [
      // === ACTION VERB + BUG FIXING PATTERNS ===
      "debug code", "fix bug", "solve issue", "resolve problem", "troubleshoot",
      "debug error", "fix error", "resolve exception", "handle crash", "investigate panic",

      // === DEBUGGING OBJECTS ===
      "debug", "stack trace", "exception", "crash", "panic",
      "bug", "issue", "problem", "fail", "error",
    ],
    skill: "code-review",
    agent: "bug-triage-specialist",
    confidence: 0.9,
    category: "development",
    priority: "high",
  },
  {
    keywords: [
      // === ACTION VERB + BUG FIXING PATTERNS ===
      "fix", "solve", "resolve", "debug", "troubleshoot",
      "investigate", "diagnose", "repair", "patch",
    ],
    skill: "code-review",
    agent: "bug-triage-specialist",
    confidence: 0.75,
    category: "development",
    priority: "medium",
  },
  {
    keywords: ["bug", "debug", "triage", "issue", "bug-tester", "tester"],
    skill: "code-review",
    agent: "bug-triage-specialist",
    confidence: 0.9,
    category: "development",
    priority: "high",
  },

  // ===== FRONTEND DEVELOPMENT =====
  {
    keywords: [
      // === ACTION VERB + TECHNOLOGY PATTERNS ===
      "develop frontend", "build frontend", "create frontend", "implement frontend",
      "develop react", "build react", "create react app", "implement react",
      "develop vue", "build vue", "create vue app", "implement vue",
      "develop angular", "build angular", "create angular app", "implement angular",

      // === FRONTEND TECHNOLOGIES ===
      "frontend", "react", "vue", "angular", "svelte", "solid",
      "javascript", "typescript", "js", "ts",
      "css", "sass", "scss", "less", "tailwind",
      "html", "jsx", "tsx", "template",

      // === FRONTEND PATTERNS ===
      "client-side", "browser", "web app", "spa", "single page application",
    ],
    skill: "frontend-development",
    agent: "frontend-engineer",
    confidence: 0.95,
    category: "development",
    priority: "high",
  },

  // ===== BACKEND DEVELOPMENT =====
  {
    keywords: [
      // === ACTION VERB + TECHNOLOGY PATTERNS ===
      "develop backend", "build backend", "create backend", "implement backend",
      "develop api", "build api", "create api", "implement api",
      "develop server", "build server", "create server", "implement server",
      "develop rest api", "build rest api", "create rest endpoint", "implement rest",
      "develop graphql", "build graphql", "create graphql schema", "implement graphql",
      "develop microservice", "build microservice", "create microservice", "implement microservice",

      // === BACKEND COMPONENTS ===
      "backend", "api", "server", "rest", "graphql", "microservice",
      "endpoint", "route", "handler", "controller", "service", "repository",
      "model", "schema", "dto", "middleware", "auth", "authentication",
      "database", "db", "sql", "orm", "migration", "seed",

      // === BACKEND TECHNOLOGIES ===
      "nodejs", "express", "nestjs", "fastapi", "django", "flask",
      "postgresql", "mysql", "mongodb", "redis", "kafka",
    ],
    skill: "backend-development",
    agent: "backend-engineer",
    confidence: 0.95,
    category: "development",
    priority: "high",
  },

  // ===== React =====
  {
    keywords: ["react", "jsx", "tsx", "hooks", "component", "state"],
    skill: "react-patterns",
    agent: "frontend-engineer",
    confidence: 0.85,
    category: "development",
    priority: "medium",
  },

  // ===== Language-specific =====
  {
    keywords: [
      "rust",
      "rustlang",
      "cargo",
      "traits",
      "borrow checker",
      "rustacean",
      "derive macro",
    ],
    skill: "rust-patterns",
    agent: "performance-engineer",
    confidence: 0.99,
    category: "development",
    priority: "high",
  },
  {
    keywords: [
      "typescript",
      " ts ",
      " ts,",
      " ts.",
      "type error",
      "type safety",
      "type system",
    ],
    skill: "typescript-expert",
    agent: "code-reviewer",
    confidence: 0.98,
    category: "development",
    priority: "high",
  },
  {
    keywords: [
      "python",
      "django",
      "flask",
      "fastapi",
      "pandas",
      "numpy",
      "pytorch",
    ],
    skill: "python-patterns",
    agent: "backend-engineer",
    confidence: 0.99,
    category: "development",
    priority: "high",
  },
  {
    keywords: [
      "golang",
      " go ",
      " go,",
      "goroutine",
      "goroutines",
      "channel",
      "gopher",
    ],
    skill: "go-patterns",
    agent: "backend-engineer",
    confidence: 0.98,
    category: "development",
    priority: "high",
  },
  {
    keywords: ["docker", "dockerfile", "containerize", "docker-compose"],
    skill: "docker-expert",
    agent: "devops-engineer",
    confidence: 0.99,
    category: "development",
    priority: "high",
  },
  {
    keywords: ["vercel", "vercel deployment", "vercel deploy"],
    skill: "vercel-deployment",
    agent: "devops-engineer",
    confidence: 0.99,
    category: "development",
    priority: "high",
  },

  // ===== State management =====
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
    category: "development",
    priority: "medium",
  },

  // ===== Session management =====
  {
    keywords: ["session", "cookie", "token", "jwt", "auth", "login", "logout"],
    skill: "session-management",
    agent: "architect",
    confidence: 0.85,
    category: "development",
    priority: "medium",
  },
];
