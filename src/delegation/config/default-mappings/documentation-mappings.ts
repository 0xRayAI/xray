/**
 * Documentation Mappings
 *
 * Maps documentation tasks to the tech-writer agent.
 * Includes README, guides, tutorials, and API documentation.
 */

import type { RoutingMapping } from '../types.js';

export const DOCUMENTATION_MAPPINGS: RoutingMapping[] = [
  {
    keywords: [
      // === ACTION VERB + DOCUMENTATION PATTERNS ===
      "write docs", "create documentation", "build documentation", "generate docs",
      "write readme", "create readme", "update readme", "write guide", "create guide",
      "write tutorial", "create tutorial", "write api docs", "generate api documentation",
      "write changelog", "create changelog", "document code", "comment code",

      // === DOCUMENTATION OBJECTS ===
      "readme", "changelog", "api documentation", "markdown",
      "documentation", "document", "doc", "comment", "guide", "tutorial", "write documentation",
      "api doc", "user guide", "developer guide", "setup guide", "installation guide",
    ],
    skill: "documentation-generation",
    agent: "tech-writer",
    confidence: 0.9,
    category: "documentation",
    priority: "high",
  },
  {
    keywords: [
      // === ACTION VERB + DOCUMENTATION PATTERNS ===
      "write documentation", "create documentation", "generate docs",

      // === DOCUMENTATION OBJECTS ===
      "document", "doc", "comment", "guide", "tutorial",
    ],
    skill: "documentation-generation",
    agent: "tech-writer",
    confidence: 0.85,
    category: "documentation",
    priority: "medium",
  },
  {
    keywords: ["docs", "documentation", "document", "write docs"],
    skill: "documentation-generation",
    agent: "tech-writer",
    confidence: 0.9,
    category: "documentation",
    priority: "high",
  },
];
