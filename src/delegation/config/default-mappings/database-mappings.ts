/**
 * Database Mappings
 *
 * Maps database-related tasks to the database-engineer agent.
 * Includes schema design, migrations, queries, and optimization.
 */

import type { RoutingMapping } from '../types.js';

export const DATABASE_MAPPINGS: RoutingMapping[] = [
  {
    keywords: ["database", "sql", "postgres", "mysql", "mongodb", "db", "migration"],
    skill: "database-design",
    agent: "database-engineer",
    confidence: 0.98,
    category: "database",
    priority: "high",
  },
  {
    keywords: ["design database schema", "database schema", "sql", "migration", "query optimization"],
    skill: "database-design",
    agent: "database-engineer",
    confidence: 0.99,
    category: "database",
    priority: "critical",
  },
  {
    keywords: ["database schema", "sql", "migration", "query optimization"],
    skill: "database-design",
    agent: "database-engineer",
    confidence: 0.98,
    category: "database",
    priority: "high",
  },
];
