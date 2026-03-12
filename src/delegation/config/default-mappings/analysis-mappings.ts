/**
 * Analysis Mappings
 *
 * Maps analysis and research tasks to various agents.
 * Includes project analysis, code analysis, visual analysis, and research.
 */

import type { RoutingMapping } from '../types.js';

export const ANALYSIS_MAPPINGS: RoutingMapping[] = [
  // ===== Project analysis =====
  {
    keywords: ["code complexity", "maintainability", "cyclomatic"],
    skill: "project-analysis",
    agent: "researcher",
    confidence: 0.95,
    category: "analysis",
    priority: "high",
  },
  {
    keywords: ["analyze", "structure", "health", "metrics", "dependencies"],
    skill: "project-analysis",
    agent: "code-analyzer",
    confidence: 0.85,
    category: "analysis",
    priority: "medium",
  },

  // ===== Code analysis =====
  {
    keywords: [
      "code analysis",
      "metrics",
      "complexity",
      "code smell",
      "technical debt",
    ],
    skill: "code-analyzer",
    agent: "code-analyzer",
    confidence: 0.9,
    category: "analysis",
    priority: "high",
  },

  // ===== Visual analysis =====
  {
    keywords: [
      "screenshot",
      "diagram",
      "image",
      "visual",
      "mockup",
      "ui design",
    ],
    skill: "multimodal-looker",
    agent: "multimodal-looker",
    confidence: 0.85,
    category: "analysis",
    priority: "medium",
  },
  {
    keywords: ["image", "diagram", "pdf", "screenshot", "visual", "multimodal"],
    skill: "visual-analysis",
    agent: "multimodal-looker",
    confidence: 0.95,
    category: "analysis",
    priority: "high",
  },

  // ===== Git workflow =====
  // SPECIAL CASE handled in special-mappings.ts:
  // "resolve merge conflict", "merge conflict", "resolve conflict"
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
    agent: "researcher",
    confidence: 0.9,
    category: "analysis",
    priority: "high",
  },
];
