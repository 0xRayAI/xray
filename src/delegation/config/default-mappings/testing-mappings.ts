/**
 * Testing Mappings
 *
 * Maps testing-related tasks to the testing-lead agent.
 * Includes test writing, test strategy, TDD/BDD, and coverage.
 */

import type { RoutingMapping } from '../types.js';

export const TESTING_MAPPINGS: RoutingMapping[] = [
  {
    keywords: [
      // === ACTION VERB + TESTING PATTERNS ===
      "test code", "write test", "create test", "build test suite", "implement test",
      "test component", "test function", "test module", "test api", "test endpoint",
      "run test", "execute test", "perform test", "run test suite",

      // === TESTING METHODOLOGIES ===
      "tdd", "bdd", "test coverage", "test strategy",
      "unit test", "integration test", "e2e", "behavior test",

      // === TESTING OBJECTS ===
      "test", "testing", "spec", "mock", "stub", "fixture",
      "test case", "test scenario", "test suite", "test runner",
      "assertion", "expectation", "test double",
    ],
    skill: "testing-best-practices",
    agent: "testing-lead",
    confidence: 0.98,
    category: "testing",
    priority: "high",
  },
  {
    keywords: [
      // === ACTION VERB + TESTING PATTERNS ===
      "write test", "create test", "design test", "plan test",
      "add test", "add tests", "write tests", "create tests",
      "implement test", "implement tests", "generate test", "generate tests",
      "need test", "need tests", "create unit test", "create integration test",
      "write unit test", "write integration test", "test coverage", "coverage report",

      // === TESTING OBJECTS ===
      "test", "testing", "spec", "mock", "stub", "fixture",
      "test case", "test scenario", "test suite", "test plan",
      "unit test", "e2e test", "integration test", "end-to-end test",
      "regression test", "smoke test", "performance test", "load test",
    ],
    skill: "testing-strategy",
    agent: "testing-lead",
    confidence: 0.92,
    category: "testing",
    priority: "high",
  },
  {
    keywords: [
      // === ACTION VERB + TESTING PATTERNS ===
      "write test", "create test", "design test", "plan test",

      // === TESTING OBJECTS ===
      "test", "testing", "spec", "mock", "stub",
      "test case", "test scenario", "test suite",
    ],
    skill: "testing-strategy",
    agent: "testing-lead",
    confidence: 0.9,
    category: "testing",
    priority: "medium",
  },
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
    agent: "testing-lead",
    confidence: 0.95,
    category: "testing",
    priority: "high",
  },
  {
    keywords: ["test", "testing", "spec", "mock", "stub"],
    skill: "testing-strategy",
    agent: "testing-lead",
    confidence: 0.9,
    category: "testing",
    priority: "medium",
  },
];
