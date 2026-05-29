#!/usr/bin/env node
/**
 * Context-Window-Aware Pre-Command Hook
 * 
 * Checks context window usage BEFORE each command is processed.
 * If context is at 95%+ (configurable), auto-generates a reflection
 * BEFORE the command runs to preserve learnings before context compaction.
 * 
 * Usage:
 *   node scripts/hooks/pre-command.mjs [--estimate-tokens N] [--threshold N]
 * 
 * Environment:
 *   HOOK_PROJECT_ROOT   - Project root directory
 *   HOOK_REFLECTIONS_DIR - Reflections directory override
 *   HOOK_DRY_RUN        - If "1", only check without generating
 *   CI                 - If "true", CI environment (less verbose)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const PROJECT_ROOT = process.env.HOOK_PROJECT_ROOT || process.cwd();
const REFLECTIONS_DIR = process.env.HOOK_REFLECTIONS_DIR || "docs/reflections";
const DRY_RUN = process.env.HOOK_DRY_RUN === "1";
const IS_CI = process.env.CI === "true" || process.argv.includes("--ci");

function log(msg) {
  if (!IS_CI) console.log(msg);
}

function warn(msg) {
  if (!IS_CI) console.warn(msg);
}

function error(msg) {
  console.error(msg);
}

function loadConfig() {
  const configPaths = [
    join(PROJECT_ROOT, ".opencode", "features.json"),
    join(PROJECT_ROOT, "node_modules", "xray", ".opencode", "features.json"),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        const config = JSON.parse(content);
        if (config.context_window_reflection) {
          return config.context_window_reflection;
        }
        if (config.storytelling?.reflection_triggers) {
          return {
            enabled: true,
            threshold_percent: 95,
            check_interval_commands: 5,
            story_type: "reflection",
            max_reflections_per_session: 3,
            cooldown_minutes: 10,
          };
        }
      } catch {
        // Try next path
      }
    }
  }

  return {
    enabled: true,
    threshold_percent: 95,
    check_interval_commands: 5,
    story_type: "reflection",
    max_reflections_per_session: 3,
    cooldown_minutes: 10,
  };
}

function estimateContextUsage() {
  let estimatedTokens = 0;

  try {
    const historyPath = join(PROJECT_ROOT, ".opencode", "logs", "conversation-history.json");
    if (existsSync(historyPath)) {
      const history = JSON.parse(readFileSync(historyPath, "utf-8"));
      if (history.messages && Array.isArray(history.messages)) {
        estimatedTokens = history.messages.reduce((sum, msg) => {
          const content = msg.content || "";
          const role = msg.role || "";
          return sum + Math.ceil((content.length + role.length) / 4);
        }, 0);
      }
    }
  } catch {
    // History not available, use CLI estimate
  }

  if (process.argv.includes("--estimate-tokens")) {
    const idx = process.argv.indexOf("--estimate-tokens") + 1;
    if (idx < process.argv.length) {
      estimatedTokens = parseInt(process.argv[idx], 10) || 0;
    }
  }

  if (estimatedTokens === 0) {
    try {
      const output = execSync("wc -c .opencode/logs/conversation-history.json 2>/dev/null || echo 0", {
        encoding: "utf-8",
        cwd: PROJECT_ROOT,
      });
      const bytes = parseInt(output.trim().split(" ")[0], 10) || 0;
      estimatedTokens = Math.ceil(bytes / 4);
    } catch {
      estimatedTokens = 5000;
    }
  }

  return estimatedTokens;
}

function getContextThreshold(config) {
  let maxTokens = 20000;

  try {
    const configPath = join(PROJECT_ROOT, ".opencode", "features.json");
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);
      if (config.token_optimization?.max_context_tokens) {
        maxTokens = config.token_optimization.max_context_tokens;
      }
    }
  } catch {
    // Use default
  }

  return Math.floor(maxTokens * (config.threshold_percent / 100));
}

function checkReflectionCooldown(stateFile, config) {
  if (!existsSync(stateFile)) {
    return { canReflect: true, minutesSince: config.cooldown_minutes + 1 };
  }

  try {
    const state = JSON.parse(readFileSync(stateFile, "utf-8"));
    const lastReflection = state.lastContextReflection || 0;
    const minutesSince = Math.floor((Date.now() - lastReflection) / 60000);
    const { max_reflections_per_session } = config;

    return {
      canReflect: state.contextReflectionCount < max_reflections_per_session && 
                minutesSince >= config.cooldown_minutes,
      minutesSince,
      count: state.contextReflectionCount || 0,
    };
  } catch {
    return { canReflect: true, minutesSince: config.cooldown_minutes + 1 };
  }
}

function updateReflectionState(stateFile, reflectionCount) {
  try {
    let state = { contextReflectionCount: 0, lastContextReflection: 0 };
    if (existsSync(stateFile)) {
      try {
        state = JSON.parse(readFileSync(stateFile, "utf-8"));
      } catch {
        // Use defaults
      }
    }

    state.contextReflectionCount = reflectionCount;
    state.lastContextReflection = Date.now();

    const dir = dirname(stateFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch {
    // Non-blocking
  }
}

function generateReflection(percentUsed, config) {
  const date = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString().split("T")[1].replace(/[:-]/g, "").slice(0, 6);
  const filename = `context-warning-${date}-${timestamp}.md`;

  const outputPath = join(REFLECTIONS_DIR, filename);
  const dir = dirname(outputPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let recentCommits = "";
  try {
    recentCommits = execSync("git log --oneline -5 --format='- %s (%h)'", {
      encoding: "utf-8",
      cwd: PROJECT_ROOT,
    });
  } catch {
    recentCommits = "# No recent commits";
  }

  const stub = `---
story_type: ${config.story_type || "reflection"}
title: "Context window warning at ${Math.round(percentUsed)}%"
date: ${date}
slug: context-warning-${date}
emotional_arc: "challenge → discovery → resolution"
codex_terms: ["reflection", "learning", "context-management"]
framework: three_act_structure
target_words: 3000
location: ${REFLECTIONS_DIR}
---

# Context Window Warning: ${Math.round(percentUsed)}% Usage

## 1. Executive Summary

Context window is at **${Math.round(percentUsed)}%** capacity. Auto-triggered reflection captured to preserve learn

gs before context compaction.

## 2. What Was / What Is / What Should Be

### What Was
Session was operating with available context headroom for current tasks.

### What Is
Context window is at **${Math.round(percentUsed)}%** capacity - approaching the ${config.threshold_percent}% threshold configured for auto-reflection trigger.

### What Should Be
Reflections captured before context compaction to preserve learnings and session context.

## 3. INNER DIALOGUE

What critical learnings need to be preserved before context is compacted? What patterns am I seeing in this session? What decisions have been made that should be documented?

## 4. Counterfactual Thinking

If we didn't capture this reflection now, what would be lost when context is compacted? What would I wish I had documented?

## 5. Personal Journey

Navigating the constraints of finite context windows while maximizing learning capture. Each session requires intentional reflection to preserve institutional knowledge.

## 6. Session Context

### Recent Commits
\`\`\`
${recentCommits}
\`\`\`

## 7. Architecture Impact
\`\`\`
Process improvement - context window awareness
\`\`\`

## 8. Key Learnings So Far

- [Fill in key learnings from this session]
- [Document important decisions made]
- [Note any technical insights]

## 9. What Still Doesn't Work

- [Identify ongoing issues]
- [Note areas needing investigation]

## 10. For Future AI

- Implement earlier reflection triggers to ensure no learnings are lost
- Consider session summarization before context compaction
- Track patterns across sessions for better context management

---

*Auto-generated context window reflection. Fill in details before context is compacted.*
`;

  writeFileSync(outputPath, stub, "utf-8");
  return outputPath;
}

async function main() {
  if (!IS_CI) {
    log("🔍 Context-Window Pre-Command Hook");
    log("============================");
  }

  const config = loadConfig();

  if (!config.enabled) {
    if (!IS_CI) log("⏭️  Context reflection disabled, skipping");
    process.exit(0);
  }

  const estimatedTokens = estimateContextUsage();
  const threshold = getContextThreshold(config);
  const percentUsed = (estimatedTokens / threshold) * 100;

  if (!IS_CI) {
    log(`📊 Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
    log(`📊 Threshold: ${config.threshold_percent}% (${threshold.toLocaleString()} tokens)`);
    log(`📊 Usage: ${Math.round(percentUsed)}%`);
  }

  if (percentUsed < config.threshold_percent) {
    if (!IS_CI) log(`✅ Context OK (${Math.round(percentUsed)}% < ${config.threshold_percent}%)`);
    process.exit(0);
  }

  warn(`⚠️  Context at ${Math.round(percentUsed)}% - above ${config.threshold_percent}% threshold`);

  const stateFile = join(PROJECT_ROOT, ".opencode", "logs", "reflection-state.json");
  const cooldown = checkReflectionCooldown(stateFile, config);

  if (!cooldown.canReflect) {
    if (!IS_CI) {
      log(`⏭️  Cooldown active (${cooldown.minutesSince}min since last, ${cooldown.count}/${config.max_reflections_per_session} this session)`);
    }
    process.exit(0);
  }

  if (DRY_RUN) {
    if (!IS_CI) log(`🧪 DRY RUN: Would generate reflection at ${Math.round(percentUsed)}%`);
    process.exit(0);
  }

  const reflectionPath = generateReflection(percentUsed, config);

  const newCount = (cooldown.count || 0) + 1;
  updateReflectionState(stateFile, newCount);

  warn(`✅ Context reflection generated: ${reflectionPath}`);
  warn(`📝 Please fill in details before context is compacted!`);

  if (!IS_CI) {
    console.log("");
    console.log("Next steps:");
    console.log(`1. Open: ${reflectionPath}`);
    console.log("2. Fill in key learnings");
    console.log("3. Save before next command (context may be compacted)");
  }

  process.exit(0);
}

main().catch((err) => {
  error(`❌ Hook error: ${err.message}`);
  process.exit(0);
});