#!/usr/bin/env node
/**
 * Auto-Reflection Generator
 * 
 * Generates reflection stubs from various triggers:
 * - CI failures
 * - Test failures
 * - Significant commits
 * - Deployment events
 * - Manual trigger
 * 
 * Usage:
 *   node scripts/node/auto-reflection-generator.cjs --trigger ci-failure
 *   node scripts/node/auto-reflection-generator.cjs --trigger test-failure --test-output "..."
 *   node scripts/node/auto-reflection-generator.cjs --trigger deployment --version 1.18.0
 *   node scripts/node/auto-reflection-generator.cjs --trigger manual --title "My Topic"
 * 
 * Environment:
 *   REFLECTIONS_DIR - Override reflections directory (default: docs/reflections)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const ARG_TYPES = ["ci-failure", "test-failure", "deployment", "manual", "commit-threshold"];
const STORY_TYPES = ["reflection", "saga", "journey"];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    trigger: null,
    title: null,
    testOutput: null,
    version: null,
    commitCount: null,
    storyType: "reflection",
    outputDir: process.env.REFLECTIONS_DIR || "docs/reflections",
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--trigger":
      case "-t":
        options.trigger = args[++i];
        break;
      case "--title":
      case "-T":
        options.title = args[++i];
        break;
      case "--test-output":
      case "-o":
        options.testOutput = args[++i];
        break;
      case "--version":
      case "-v":
        options.version = args[++i];
        break;
      case "--story-type":
      case "-s":
        options.storyType = args[++i];
        break;
      case "--output-dir":
        options.outputDir = args[++i];
        break;
    }
  }
  
  return options;
}

function validateArgs(options) {
  if (!options.trigger || !ARG_TYPES.includes(options.trigger)) {
    console.error(`❌ Invalid trigger. Must be one of: ${ARG_TYPES.join(", ")}`);
    process.exit(1);
  }
  
  if (options.storyType && !STORY_TYPES.includes(options.storyType)) {
    console.error(`❌ Invalid story type. Must be one of: ${STORY_TYPES.join(", ")}`);
    process.exit(1);
  }
  
  if (!existsSync(options.outputDir)) {
    mkdirSync(options.outputDir, { recursive: true });
  }
}

function getRecentCommits(count = 10) {
  try {
    return execSync(`git log --oneline -${count} --format="- %s (%h)"`, { encoding: "utf-8" });
  } catch {
    return "Unable to retrieve commits";
  }
}

function getChangedFiles(count = 20) {
  try {
    return execSync(`git diff --name-only HEAD~${count} 2>/dev/null | head -${count}`, { encoding: "utf-8" });
  } catch {
    return "Unable to retrieve changed files";
  }
}

function getCommitCountSinceLastReflection(reflectionsDir) {
  try {
    const files = readdirSync(reflectionsDir).filter(f => f.endsWith(".md"));
    if (files.length === 0) {
      return execSync("git rev-list --count HEAD", { encoding: "utf-8" }).trim();
    }
    
    let mostRecent = null;
    let mostRecentTime = 0;
    
    for (const file of files) {
      const filePath = join(reflectionsDir, file);
      const stat = statSync(filePath);
      if (stat.mtime.getTime() > mostRecentTime) {
        mostRecentTime = stat.mtime.getTime();
        mostRecent = filePath;
      }
    }
    
    if (!mostRecent) {
      return execSync("git rev-list --count HEAD", { encoding: "utf-8" }).trim();
    }
    
    const refDate = new Date(mostRecentTime).toISOString();
    const result = execSync(`git rev-list --count --since="${refDate}" HEAD`, { encoding: "utf-8" });
    return result.trim();
  } catch {
    return "0";
  }
}

function generateFilename(trigger, title) {
  const date = new Date().toISOString().split("T")[0];
  const slug = title 
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : trigger;
  const prefix = trigger === "commit-threshold" ? "commit-threshold" : "auto";
  return `${prefix}-${slug}-${date}.md`;
}

function generateReflectionStub(options) {
  const { trigger, title, testOutput, version, storyType } = options;
  const date = new Date().toISOString().split("T")[0];
  const slug = `${trigger}-${date}`;
  
  const templates = {
    "ci-failure": {
      executiveSummary: `CI/CD pipeline failure detected on ${date}. Investigating root cause and implementing fixes.`,
      whatWas: "CI pipeline was operating normally with passing tests and builds.",
      whatIs: `Pipeline failed during workflow execution.`,
      whatShouldBe: "All CI stages should pass consistently with clear failure diagnostics.",
      innerDialogue: "Analyzing the failure to understand what went wrong and how to prevent recurrence.",
      counterfactual: "If we had better monitoring and alerting, we would have caught this earlier.",
      personalJourney: "Debugging CI failures is a key part of maintaining system reliability.",
      futureAI: "Continue improving test coverage and monitoring to catch issues earlier.",
    },
    "test-failure": {
      executiveSummary: `Test failure detected on ${date}. Analyzing test output and identifying root cause.`,
      whatWas: "All tests were passing in the previous run.",
      whatIs: `Test suite failed with failures in: ${testOutput || "unknown tests"}`,
      whatShouldBe: "All tests should pass before merging. Fix failures promptly.",
      innerDialogue: "Investigating why tests are failing and what changed.",
      counterfactual: "If we had stricter pre-commit checks, this would have been caught earlier.",
      personalJourney: "Debugging test failures leads to better understanding of the system.",
      futureAI: "Improve test coverage and add more comprehensive regression tests.",
    },
    "deployment": {
      executiveSummary: `Deployment ${version || "completed"} on ${date}. Documenting the release process and any issues encountered.`,
      whatWas: "Previous version was running in production.",
      whatIs: `New version ${version || "deployed"} is now live.`,
      whatShouldBe: "Deployments should be smooth with rollback capability.",
      innerDialogue: "Reviewing deployment for lessons learned.",
      counterfactual: "If we had more automated testing, deployment would be smoother.",
      personalJourney: "Each deployment is an opportunity to improve the release process.",
      futureAI: "Improve deployment automation and rollback procedures.",
    },
    "manual": {
      executiveSummary: title ? `Reflection on: ${title}` : "Manual reflection triggered",
      whatWas: "Previous state before this work began.",
      whatIs: "Current state after this work.",
      whatShouldBe: "Desired future state.",
      innerDialogue: "Reflecting on the work done and its implications.",
      counterfactual: "What would have happened if we took a different approach?",
      personalJourney: "Documenting my learning journey.",
      futureAI: "Lessons from this work to carry forward.",
    },
    "commit-threshold": {
      executiveSummary: `Multiple commits without reflection. ${title || "Documenting recent changes."}`,
      whatWas: "Last reflection was written some time ago.",
      whatIs: `${title || "Many changes have accumulated since then."}`,
      whatShouldBe: "Regular reflections to capture learning.",
      innerDialogue: "What have I learned from all these changes?",
      counterfactual: "If we wrote reflections more often, we'd capture more insights.",
      personalJourney: "The journey through these commits.",
      futureAI: "Maintain regular reflection cadence.",
    },
  };
  
  const content = templates[trigger] || templates.manual;
  const storyTypeLocation = storyType === "saga" ? "docs/reflections/deep/" : options.outputDir;
  
  const stub = `---
story_type: ${storyType}
title: "${content.executiveSummary.split(".")[0]}"
date: ${date}
slug: ${slug}
emotional_arc: "challenge → discovery → resolution"
codex_terms: ["reflection", "learning", "documentation"]
framework: three_act_structure
target_words: 3000
location: ${storyTypeLocation}
---

# ${content.executiveSummary.split(".")[0]}

## 1. Executive Summary
${content.executiveSummary}

## 2. What Was / What Is / What Should Be

### What Was
${content.whatWas}

### What Is
${content.whatIs}

### What Should Be
${content.whatShouldBe}

## 3. INNER DIALOGUE
${content.innerDialogue}

## 4. Counterfactual Thinking
${content.counterfactual}

## 5. Personal Journey
${content.personalJourney}

## 6. Code Examples

### Recent Commits
\`\`\`
${getRecentCommits(10)}
\`\`\`

### Changed Files
\`\`\`
${getChangedFiles(15)}
\`\`\`

## 7. Architecture Impact
\`\`\`
Current architecture unchanged - process improvement
\`\`\`

## 8. Files Modified
| File | Change |
|------|--------|
| Auto-generated | Reflection stub |

## 9. What Still Doesn't Work
- Need to investigate specific details
- Fill in the context above

## 10. For Future AI
${content.futureAI}

---

*Auto-generated reflection stub. Please fill in the details and complete the reflection.*
`;
  
  return stub;
}

async function main() {
  console.log("🔄 Auto-Reflection Generator");
  console.log("============================");
  console.log("");
  
  const options = parseArgs();
  validateArgs(options);
  
  const filename = generateFilename(options.trigger, options.title);
  const outputPath = join(options.outputDir, filename);
  
  console.log(`📝 Trigger: ${options.trigger}`);
  console.log(`📄 Output: ${outputPath}`);
  console.log("");
  
  const stub = generateReflectionStub(options);
  writeFileSync(outputPath, stub, "utf-8");
  
  console.log("✅ Reflection stub generated!");
  console.log("");
  console.log("Next steps:");
  console.log(`1. Open: ${outputPath}`);
  console.log("2. Fill in the details");
  console.log("3. Validate: ./scripts/node/reflection-validate.sh docs/reflections/${filename}");
  console.log("4. Commit when ready");
  console.log("");
  
  if (options.trigger === "commit-threshold") {
    const commitCount = getCommitCountSinceLastReflection(options.outputDir);
    console.log(`📊 Commits since last reflection: ${commitCount}`);
  }
}

main().catch(console.error);