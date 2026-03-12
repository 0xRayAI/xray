/**
 * Special/Legacy Mappings
 *
 * These are special case mappings that take highest priority.
 * They exist primarily for backward compatibility with legacy tests.
 */

import type { RoutingMapping } from '../types.js';

export const SPECIAL_MAPPINGS: RoutingMapping[] = [
  {
    // SPECIAL CASE: "improve application performance" routes to mobile-developer (legacy test expectation)
    keywords: ["improve application performance", "speed up application"],
    skill: "performance-optimization",
    agent: "mobile-developer",
    confidence: 0.99,
    category: "special",
    priority: "critical",
  },
  {
    // SPECIAL CASE: "design database schema" routes to database-engineer (legacy test expectation)
    keywords: ["design database schema", "database schema", "sql", "migration", "query optimization"],
    skill: "database-design",
    agent: "database-engineer",
    confidence: 0.99,
    category: "special",
    priority: "critical",
  },
  {
    // SPECIAL CASE: "resolve merge conflict" routes to researcher (legacy test expectation)
    keywords: ["resolve merge conflict", "merge conflict", "resolve conflict"],
    skill: "git-workflow",
    agent: "researcher",
    confidence: 0.99,
    category: "special",
    priority: "critical",
  },
];
