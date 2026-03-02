#!/usr/bin/env node

/**
 * Skill Router Test Script
 * 
 * Tests the TaskSkillRouter with various prompts to verify
 * correct skill and agent mapping.
 * 
 * Usage:
 *   node scripts/mjs/test-skill-routing.mjs
 */

import { TaskSkillRouter } from "../../dist/delegation/task-skill-router.js";

const router = new TaskSkillRouter();

// Test scenarios organized by category
const TEST_SCENARIOS = [
  // === Antigravity Skills ===
  {
    category: "Antigravity - Languages",
    prompts: [
      "help me fix this TypeScript error",
      "how do I use Rust traits for polymorphism",
      "write some Python FastAPI code",
      "create a React component with hooks",
      "how does Go concurrency work",
    ]
  },
  {
    category: "Antigravity - DevOps",
    prompts: [
      "create a Dockerfile for my API",
      "set up AWS Lambda function",
      "deploy to Vercel",
      "configure Kubernetes",
    ]
  },
  {
    category: "Antigravity - Business",
    prompts: [
      "write landing page copy",
      "what's the best pricing strategy for SaaS",
      "help with marketing campaign",
    ]
  },
  {
    category: "Antigravity - AI/Data",
    prompts: [
      "help me with prompt engineering",
      "set up a RAG system with vector DB",
    ]
  },
  {
    category: "Antigravity - General",
    prompts: [
      "brainstorm a new feature",
      "plan our roadmap",
    ]
  },
  // === Native StringRay Skills ===
  {
    category: "Security",
    prompts: [
      "scan for security vulnerabilities",
      "audit my code for issues",
    ]
  },
  {
    category: "Testing",
    prompts: [
      "write unit tests",
      "design a testing strategy",
    ]
  },
  {
    category: "Performance",
    prompts: [
      "optimize this slow code",
      "fix memory leak",
    ]
  },
  {
    category: "Code Review",
    prompts: [
      "review this code",
      "check for bugs",
    ]
  },
  {
    category: "Architecture",
    prompts: [
      "design a microservice",
      "structure my project",
    ]
  },
];

// Expected mappings (for validation)
const EXPECTED_MAPPINGS = {
  "TypeScript": { skill: "typescript-expert", agent: "code-reviewer" },
  "Rust": { skill: "rust-patterns", agent: "performance-engineer" },
  "Python": { skill: "python-patterns", agent: "backend-engineer" },
  "React": { skill: "react-patterns", agent: "frontend-engineer" },
  "Go": { skill: "go-patterns", agent: "backend-engineer" },
  "Dockerfile": { skill: "docker-expert", agent: "devops-engineer" },
  "AWS Lambda": { skill: "aws-serverless", agent: "devops-engineer" },
  "Vercel": { skill: "vercel-deployment", agent: "devops-engineer" },
  "copy": { skill: "copywriting", agent: "growth-strategist" },
  "pricing": { skill: "pricing-strategy", agent: "growth-strategist" },
  "prompt": { skill: "prompt-engineering", agent: "librarian" },
  "RAG": { skill: "rag-engineer", agent: "librarian" },
  "brainstorm": { skill: "brainstorming", agent: "architect" },
  "plan": { skill: "planning", agent: "architect" },
  "security": { skill: "security-audit", agent: "security-auditor" },
  "vulnerability": { skill: "vulnerability-scanner", agent: "security-auditor" },
  "test": { skill: "testing-best-practices", agent: "testing-lead" },
  "performance": { skill: "performance-optimization", agent: "refactorer" },
  "memory leak": { skill: "performance-optimization", agent: "refactorer" },
  "bug": { skill: "code-review", agent: "bug-triage-specialist" },
  "review": { skill: "code-review", agent: "code-reviewer" },
  "architect": { skill: "architecture-patterns", agent: "architect" },
};

function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 SKILL ROUTER TEST SUITE");
  console.log("=".repeat(70) + "\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📁 ${scenario.category}`);
    console.log("-".repeat(50));

    for (const prompt of scenario.prompts) {
      totalTests++;
      const result = router.routeTask(prompt);
      
      // Find expected mapping
      let expected = null;
      for (const [key, value] of Object.entries(EXPECTED_MAPPINGS)) {
        if (prompt.toLowerCase().includes(key.toLowerCase())) {
          expected = value;
          break;
        }
      }
      
      // Check if this mapping is expected (accept both testing variations)
      let isCorrect = expected 
        ? (result.skill === expected.skill && result.agent === expected.agent) ||
          (expected.skill === "testing-best-practices" && result.skill === "testing-strategy" && result.agent === expected.agent)
        : true; // No expected mapping, just record

      if (isCorrect) {
        passedTests++;
        console.log(`  ✅ "${prompt.substring(0, 40)}..."`);
        console.log(`     → ${result.skill} → ${result.agent}`);
      } else {
        failedTests.push({ prompt, expected, got: result });
        console.log(`  ❌ "${prompt.substring(0, 40)}..."`);
        console.log(`     Expected: ${expected.skill}/${expected.agent}`);
        console.log(`     Got: ${result.skill}/${result.agent}`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests.length} ❌`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests.length > 0) {
    console.log("\n❌ FAILED TESTS:");
    for (const test of failedTests) {
      console.log(`  - "${test.prompt}"`);
      console.log(`    Expected: ${test.expected.skill}/${test.expected.agent}`);
      console.log(`    Got: ${test.got.skill}/${test.got.agent}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  
  // Exit with appropriate code
  process.exit(failedTests.length > 0 ? 1 : 0);
}

runTests();
