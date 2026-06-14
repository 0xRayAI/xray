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

const ARG_TYPES = ["ci-failure", "test-failure", "deployment", "manual", "commit-threshold", "context-warning"];
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
    force: false,
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
      case "--force":
      case "-f":
        options.force = true;
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

function loadConfig() {
  // Primary: .opencode/xray/ YML SSOT. Min legacy fallbacks for .opencode/strray/ + .strray/ (transitional consumer compat; documented per Term 61)
  const configPath = join(process.cwd(), ".opencode", "xray", "features.json");
  const fallbackPath = join(process.cwd(), ".opencode", "strray", "features.json");
  const legacyPath = join(process.cwd(), ".strray", "features.json");
  
  for (const p of [configPath, fallbackPath, legacyPath]) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed.auto_reflection) {
          return parsed.auto_reflection;
        }
        if (parsed.storytelling?.reflection_triggers) {
          // Legacy support - convert from storytelling config
          const triggers = parsed.storytelling.reflection_triggers;
          return {
            mode: "minimal",
            triggers: {
              commit_threshold: {
                enabled: triggers.commit_count?.enabled ?? true,
                threshold: triggers.commit_count?.threshold ?? 10,
              },
              time_threshold: {
                enabled: true,
                days: 7,
              },
            },
            thresholds: {
              full: { commit_threshold: 10, days_threshold: 5 },
              minimal: { commit_threshold: 25, days_threshold: 14 },
              off: { commit_threshold: 999, days_threshold: 365 },
            },
          };
        }
      } catch {
        // ignore
      }
    }
  }
  
  // Default config
  return {
    mode: "minimal",
    thresholds: {
      full: { commit_threshold: 10, days_threshold: 5 },
      minimal: { commit_threshold: 25, days_threshold: 14 },
      off: { commit_threshold: 999, days_threshold: 365 },
    },
  };
}

function checkAutoReflectionNeeded(config) {
  const mode = config?.mode || "minimal";
  const thresholds = config?.thresholds?.[mode] || { commit_threshold: 25, days_threshold: 14 };
  
  const reflectionsDir = process.env.REFLECTIONS_DIR || "docs/reflections";
  
  try {
    if (!existsSync(reflectionsDir)) {
      return { needed: true, reason: "no reflections directory", mode, thresholds };
    }
    
    const files = readdirSync(reflectionsDir).filter(f => f.endsWith(".md"));
    if (files.length === 0) {
      return { needed: true, reason: "no reflections exist", mode, thresholds };
    }
    
    // Find most recent reflection
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
      return { needed: true, reason: "no reflections found", mode, thresholds };
    }
    
    const daysSince = Math.floor((Date.now() - mostRecentTime) / (1000 * 60 * 60 * 24));
    const commitCount = parseInt(getCommitCountSinceLastReflection(reflectionsDir), 10);
    
    const commitNeeded = commitCount > thresholds.commit_threshold;
    const timeNeeded = daysSince > thresholds.days_threshold;
    
    return {
      needed: commitNeeded || timeNeeded,
      reason: commitNeeded ? `commits (${commitCount} > ${thresholds.commit_threshold})` : 
               timeNeeded ? `time (${daysSince} > ${thresholds.days_threshold} days)` : "ok",
      mode,
      thresholds,
      commitsSince: commitCount,
      daysSince,
    };
  } catch (e) {
    return { needed: false, error: e.message, mode, thresholds };
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

function generateFilename(trigger, title, recentCommits = []) {
  const date = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString().split("T")[1].replace(/[:-]/g, "").slice(0, 6);
  
  let slug;
  
  if (title) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  } else if (trigger === "commit-threshold" && recentCommits.length > 0) {
    const firstCommit = recentCommits[0]?.message || "";
    const meaningful = firstCommit.length > 30 ? firstCommit.slice(0, 30) + "..." : firstCommit;
    slug = meaningful.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  } else if (trigger === "ci-failure") {
    slug = "ci-pipeline-failure";
  } else if (trigger === "test-failure") {
    slug = "test-suite-failure";
  } else if (trigger === "deployment") {
    slug = "deployment-event";
  } else if (trigger === "manual") {
    slug = "manual-reflection";
  } else {
    slug = trigger;
  }
  
  const typePrefix = {
    "commit-threshold": "checkpoint",
    "ci-failure": "auto-ci",
    "test-failure": "auto-test",
    "deployment": "auto-deployment",
    "manual": "manual",
    "context-warning": "context-warning",
  }[trigger] || "auto";
  
  const uniqueSuffix = timestamp;
  
  return `${typePrefix}-${slug}-${date}-${uniqueSuffix}.md`;
}

function getRecentCommitsForSummary(count = 5) {
  try {
    const result = execSync(`git log --oneline -${count} --format="%s"`, { encoding: "utf-8" });
    return result.trim().split("\n").map(msg => ({ message: msg }));
  } catch {
    return [];
  }
}

function generateReflectionStub(options, check = null) {
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
      executiveSummary: `Checkpoint reflection: ${title || "Multiple commits since last reflection"}`,
      whatWas: `Last reflection was written ${check?.daysSince || "recently"} days ago.`,
      whatIs: `${check?.commitsSince || "Multiple"} commits have been made since the last reflection.`,
      whatShouldBe: "Regular reflections to capture learning and track progress.",
      innerDialogue: `What have I learned from the ${check?.commitsSince || "recent"} changes? What patterns are emerging?`,
      counterfactual: "If we wrote reflections more often, we'd capture more insights for future iterations.",
      personalJourney: "Documenting the journey through this cycle of commits and learning.",
      futureAI: "Maintain regular reflection cadence to ensure continuous learning.",
    },
    "context-warning": {
      executiveSummary: `Context window warning: ${title || "Approaching context limit"}`,
      whatWas: "Session was operating with available context headroom.",
      whatIs: `Context window is at ${title || "95%+"} capacity. Reflection captured before context compaction.`,
      whatShouldBe: "Reflections captured before context compaction to preserve learnings.",
      innerDialogue: "What critical learnings need to be preserved before context is compacted? What patterns am I seeing in this session?",
      counterfactual: "If we didn't capture this reflection now, what would be lost when context is compacted?",
      personalJourney: "Navigating the constraints of finite context windows while maximizing learning capture.",
      futureAI: "Implement earlier reflection triggers to ensure no learnings are lost to context compaction.",
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
  
  // Load config and check if auto-reflection is needed
  const config = loadConfig();
  const mode = config?.mode || "minimal";
  
  console.log(`📊 Auto-reflection mode: ${mode}`);
  
  // For commit-threshold trigger, check if it's actually needed
  if (options.trigger === "commit-threshold" && !options.force) {
    const check = checkAutoReflectionNeeded(config);
    console.log(`📊 Status: ${check.needed ? "NEEDED" : "not needed"} (${check.reason})`);
    console.log(`📊 Thresholds: ${check.thresholds?.commit_threshold || 25} commits, ${check.thresholds?.days_threshold || 14} days`);
    
    if (!check.needed) {
      console.log("");
      console.log("✅ No reflection needed yet. Use --force to generate anyway.");
      return;
    }
  }
  
  const recentCommits = getRecentCommitsForSummary(5);
  const filename = generateFilename(options.trigger, options.title, recentCommits);
  const outputPath = join(options.outputDir, filename);
  
  let check = null;
  if (options.trigger === "commit-threshold") {
    check = checkAutoReflectionNeeded(config);
  }
  
  console.log(`📝 Trigger: ${options.trigger}`);
  console.log(`📄 Output: ${outputPath}`);
  console.log("");
  
  const stub = generateReflectionStub(options, check);
  writeFileSync(outputPath, stub, "utf-8");
  
  console.log("✅ Reflection stub generated!");
  console.log("");
  console.log("Next steps:");
  console.log(`1. Open: ${outputPath}`);
  console.log("2. Fill in the details");
  console.log(`3. Validate: ./scripts/node/reflection-validate.sh docs/reflections/${filename}`);
  console.log("4. Commit when ready");
  console.log("");
  
  if (check) {
    console.log(`📊 Commits since last reflection: ${check.commitsSince}`);
    console.log(`📊 Days since last reflection: ${check.daysSince}`);
  }
}

main().catch(console.error);
