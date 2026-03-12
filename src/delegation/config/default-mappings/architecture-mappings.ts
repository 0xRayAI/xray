/**
 * Architecture Mappings
 *
 * Maps architecture and high-level design tasks to the architect agent.
 * Includes system design, API design, and strategic planning.
 */

import type { RoutingMapping } from '../types.js';

export const ARCHITECTURE_MAPPINGS: RoutingMapping[] = [
  {
    keywords: ["system architecture", "microservice", "distributed system"],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.95,
    category: "architecture",
    priority: "high",
  },
  {
    keywords: [
      // === SYSTEM DESIGN ===
      "system architecture", "microservice", "distributed system", "system design",
      "design system", "architecture design", "high-level design", "technical design",
      "system structure", "component design", "module design", "service design",

      // === ARCHITECTURE PATTERNS ===
      "architect", "architecture", "structure", "pattern", "architectural",
      "design pattern", "architecture pattern", "patterns", "best practices",

      // === NEW FEATURE ===
      "new feature", "add feature", "create feature", "implement feature",
      "feature design", "feature architecture", "build new", "design new",

      // === REFACTOR ===
      "refactor", "restructure", "reorganize", "improve structure",
    ],
    skill: "architecture-patterns",
    agent: "architect",
    confidence: 0.9,
    category: "architecture",
    priority: "high",
  },
  {
    keywords: ["rest api", "graphql", "endpoint", "route handler"],
    skill: "api-design",
    agent: "architect",
    confidence: 0.9,
    category: "architecture",
    priority: "high",
  },
  {
    keywords: ["api", "backend", "server", "crud"],
    skill: "api-design",
    agent: "architect",
    confidence: 0.8,
    category: "architecture",
    priority: "medium",
  },
  {
    keywords: [
      "strategic",
      "guidance",
      "architecture decision",
      "risk assessment",
      "technical strategy",
      "planning",
      "next steps",
      "recommend",
      "advice",
    ],
    skill: "strategist",
    agent: "strategist",
    confidence: 0.85,
    category: "architecture",
    priority: "medium",
  },
  {
    keywords: ["brainstorm", "ideate", "design thinking", "workshop"],
    skill: "brainstorming",
    agent: "architect",
    confidence: 0.85,
    category: "architecture",
    priority: "medium",
  },
  {
    keywords: ["plan", "roadmap", "milestone", "sprint planning"],
    skill: "planning",
    agent: "architect",
    confidence: 0.85,
    category: "architecture",
    priority: "medium",
  },
];
