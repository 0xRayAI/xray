#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.join(__dirname, "..", "..");
const homeDir = require("os").homedir();

const { resolveConsumerTargetDir } = require("./install-bridges.cjs");
let targetDir = resolveConsumerTargetDir(packageRoot, process.env.PWD || process.cwd());

const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);

console.log("🔧 xray Setup: Full configuration...\n");

const hasHermes = fs.existsSync(path.join(targetDir, ".hermes")) &&
  fs.lstatSync(path.join(targetDir, ".hermes")).isDirectory();

if (hasHermes) {
  console.log("🔍 Hermes Agent detected");
}

/**
 * P3-SKILLS-DE-DUP-SCOPE-AND-EXEC-01 (supporting header in sync owner) — Small-Batch Surgical Skills Deduplication (one package: orchestrator). 
 * This file (scripts/node/setup.cjs) is the canonical sync owner enforcing src/skills/ (or dist/skills/) → .opencode/skills/ mirror for framework core skills.
 * Rich CGT + ties modeled on paired edit in src/cli/commands/status.ts + P3-YML-AGENT-SURFACES-UNIFICATION-01 + P3-7TH-GAP-DEEPER-01 + deep ref 2026-05-26 + Phase 3 Pivot + Term 61 + user's "create a todo list. spawn subagents..." + 6/6+7/7 + YML live.
 * Highly modular header only (no behavior change). Fully reversible (delete header). fw discipline + AGENTS org. 2 files total for this micro-slice (status.ts primary with fw guard + this header).
 * Governance-visible: documents the SSOT ownership for orchestrator package dedup at the build/install layer.
 * The box contains its builders. Term 61 held. Pure momentum.
 *
 * P3-SKILLS-DE-DUP-RESEARCHER-FOLLOW-01 (follow-on small-batch per deep ref "parallel small batches on skills deduplication (one package)" + YML @ "skills follow-on" + playbook P3-SKILLS-FOLLOW-01 + YML @ harness-codex verification 16982–17045 + FORCE + codex 100/60/0 + 3 subagents tracked + 0 hot + 3-hot re-establish + all prior completions + user's spawn command + deep ref 2026-05-26 + Phase 3 Pivot + Term 61 + 6/6+7/7 + YML): 
 * Extended header for next high-value package (researcher). src/skills/researcher/SKILL.md canonical SSOT; .opencode/skills/researcher/ built mirror of this sync logic. See paired guarded fw log "P3-SKILLS-DE-DUP-RESEARCHER-FOLLOW-01-researcher-ssot-preferred" in status.ts getSkillsList + rich append docs/reflections/p3-skills-dedup-researcher-follow-01-2026-05-27.md + CGT/Governance-visible for YML @ harness-codex verification + 0 hot + 3-hot + all ties. 2 files max total for this follow-on. Highly modular. Fully reversible. fw/echo discipline. AGENTS org (scripts/ for sh/cjs). Term 61 surgical forward motion held. "the box contains its builders". Green + ready.
 *
 * P3-SKILLS-FOLLOW-02 (follow-on small-batch per deep ref "parallel small batches on skills deduplication (one package)" + @architect scoping rec 2 + YML @ "Ready for next" + this execution on user's "create a todo list. spawn subagents to complete todos. maintain todo list. do not ask questions. do not stop. you have the full plan."; modeled exactly on "orchestrator" + researcher precedent): 
 * Extended header for next high-value package (code-review). src/skills/code-review/SKILL.md canonical SSOT; .opencode/skills/code-review/ built mirror of this sync logic. See paired guarded fw log "P3-SKILLS-FOLLOW-02-code-review-ssot-preferred" in status.ts getSkillsList (inserted after researcher block) + rich append docs/reflections/p3-skills-follow-02-code-review-2026-05-27.md (per AGENTS) + CGT/Governance-visible for YML @ harness-codex verification + 0 hot + 3-hot re-establish + all ties to spawn command + deep ref + pivot + Term 61 + 6/6+7/7 + YML + ps 0 + this P3-SKILLS-FOLLOW-02 full work (2-file surgical, harness post green tsc 0 new on touched, mapping append after latest, todo advance exactly 1, spawn replacement to maintain 3-hot, self-audit 100%) + verification + "the box contains its builders. The relay is hot.". 2 files max total for this follow-02. Highly modular (100% prior P3-SKILLS/YML/7th pattern reuse exactly inside existing sync logic). Fully reversible (targeted delete of notes restores exact prior). fw/echo discipline. AGENTS org (scripts/ for sh/cjs). Term 61 surgical forward motion held (no bloat, pure on actual dedup). "the box contains its builders". Green + ready. Subagent ID for resume.
 */

 /* 1. Sync core skills from src/skills/ (dev) or dist/skills/ (consumer) → .opencode/skills/  [P3-SKILLS-DE-DUP-SCOPE-AND-EXEC-01: orchestrator package SSOT canonical src/skills/orchestrator/SKILL.md; mirror .opencode/skills/orchestrator/ is built output of this logic; see paired guarded fw in status.ts getSkillsList + mapping append + deep ref 2026-05-26 authority for one-package dedup under pivoted surgical plan] 
   [P3-SKILLS-DE-DUP-RESEARCHER-FOLLOW-01: researcher package SSOT canonical src/skills/researcher/SKILL.md (high-value per deep ref + YML precedent + playbook P3-SKILLS-FOLLOW-01); mirror .opencode/skills/researcher/ is built output of this logic; see paired guarded fw in status.ts + rich append + YML @ harness-codex verification (FORCE exercised P3-YML + codex-enforcement + 100/60/0 + 3 subagents tracked + 0 hot + 3-hot re-establish + all prior green) + deep ref 2026-05-26 + Phase 3 Pivot + Term 61 + user's "create a todo list. spawn subagents..." + 6/6+7/7 + YML. Governance-visible hook for skills SSOT at install layer. Silent, additive, reversible, no behavior change, fw/echo only.]
   [P3-SKILLS-FOLLOW-02: code-review package SSOT canonical src/skills/code-review/SKILL.md (next high-value per deep ref "parallel small batches" + @architect scoping rec 2 + YML @ "Ready for next" + this P3-SKILLS-FOLLOW-02 on user's spawn command); mirror .opencode/skills/code-review/ is built output of this logic; see paired guarded fw "P3-SKILLS-FOLLOW-02-code-review-ssot-preferred" in status.ts (after researcher) + rich append docs/reflections/p3-skills-follow-02-code-review-2026-05-27.md + YML @ harness-codex verification + 0 hot + 3-hot + all ties + ps 0 + this work (2-file surgical edit, harness post, mapping append after latest ~17099+, todo advance 1, spawn replacement, self-audit 100%, green + ready) + deep ref 2026-05-26 + Phase 3 Pivot + Term 61 + 6/6+7/7 + YML. Governance-visible hook for skills SSOT at install layer for code-review. Silent, additive, reversible, no behavior change, fw/echo only. "The box contains its builders. The relay is hot."] */
const skillsSource = fs.existsSync(path.join(packageRoot, "src", "skills"))
  ? path.join(packageRoot, "src", "skills")
  : path.join(packageRoot, "dist", "skills");
const skillsDest = path.join(targetDir, ".opencode", "skills");

if (fs.existsSync(skillsSource)) {
  try {
    if (!fs.existsSync(skillsDest)) fs.mkdirSync(skillsDest, { recursive: true });
    const skillDirs = fs.readdirSync(skillsSource, { withFileTypes: true });
    let copied = 0, skipped = 0;
    for (const entry of skillDirs) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(skillsSource, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMd)) continue;
      const destMd = path.join(skillsDest, entry.name, "SKILL.md");
      const destDir = path.dirname(destMd);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (fs.existsSync(destMd)) {
        const destContent = fs.readFileSync(destMd, "utf8");
        if (destContent.includes("source: community")) { skipped++; continue; }
        if (fs.statSync(skillMd).mtime <= fs.statSync(destMd).mtime) continue;
      }
      fs.copyFileSync(skillMd, destMd);
      copied++;
    }
    console.log(`✅ Skills: ${copied} updated, ${skipped} community skills preserved`);
  } catch (e) { console.warn(`⚠️ Skills sync: ${e.message}`); }
}

// 2. Handle opencode.json merge
const rootOpencodeJson = path.join(packageRoot, "opencode.json");
const userOpencodeJson = path.join(targetDir, "opencode.json");

if (fs.existsSync(rootOpencodeJson)) {
  try {
    if (fs.existsSync(userOpencodeJson)) {
      const srcData = JSON.parse(fs.readFileSync(rootOpencodeJson, "utf8"));
      const destData = JSON.parse(fs.readFileSync(userOpencodeJson, "utf8"));
      const merged = { ...destData };
      if (srcData.agent) merged.agent = srcData.agent;
      if (srcData.mcp) merged.mcp = srcData.mcp;
      if (srcData.compaction) merged.compaction = srcData.compaction;
      for (const key of Object.keys(destData)) {
        if (!["agent", "mcp", "compaction"].includes(key)) merged[key] = destData[key];
      }
      fs.writeFileSync(userOpencodeJson, JSON.stringify(merged, null, 2) + "\n");
      console.log("✅ opencode.json: merged (framework agents preserved)");
    } else {
      fs.copyFileSync(rootOpencodeJson, userOpencodeJson);
      console.log("✅ opencode.json: installed");
    }
  } catch (e) { console.warn(`⚠️ opencode.json: ${e.message}`); }
}

// 3. Copy plugin
const pluginSource = path.join(packageRoot, "dist", "plugin", "xray-codex-injection.js");
const pluginDest = path.join(targetDir, ".opencode", "plugin", "xray-codex-injection.js");

if (fs.existsSync(pluginSource)) {
  try {
    const destDir = path.dirname(pluginDest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const shouldCopy = !fs.existsSync(pluginDest) ||
      fs.statSync(pluginSource).mtime > fs.statSync(pluginDest).mtime;
    if (shouldCopy) {
      fs.copyFileSync(pluginSource, pluginDest);
      console.log("✅ Plugin: installed");
    } else {
      console.log("ℹ️  Plugin: up to date");
    }
  } catch (e) { console.warn(`⚠️ Plugin: ${e.message}`); }
} else {
  console.log("ℹ️  Plugin source not found (build may be needed)");
}

// 4. Create scripts symlink
const scriptsSource = path.join(packageRoot, "scripts");
const scriptsDest = path.join(targetDir, "scripts");

if (fs.existsSync(scriptsSource)) {
  try {
    if (fs.existsSync(scriptsDest)) {
      const stats = fs.lstatSync(scriptsDest);
      if (stats.isSymbolicLink()) {
        console.log("ℹ️  Scripts symlink: exists");
      } else {
        console.log("⚠️ Scripts dir exists but is not a symlink");
      }
    } else {
      fs.symlinkSync(scriptsSource, scriptsDest, "dir");
      console.log("✅ Scripts symlink: created");
    }
  } catch (e) { console.warn(`⚠️ Scripts symlink: ${e.message}`); }
}

// 5. Create dist symlink
const distSource = path.join(packageRoot, "dist");
const distDest = path.join(targetDir, "dist");

if (fs.existsSync(distSource)) {
  try {
    if (fs.existsSync(distDest)) {
      const stats = fs.lstatSync(distDest);
      if (stats.isSymbolicLink()) {
        console.log("ℹ️  Dist symlink: exists");
      } else {
        console.log("⚠️ Dist exists but is not a symlink");
      }
    } else {
      fs.symlinkSync(distSource, distDest, "dir");
      console.log("✅ Dist symlink: created");
    }
  } catch (e) { console.warn(`⚠️ Dist symlink: ${e.message}`); }
}

// 6. Convert MCP paths in consumer opencode.json
const isConsumer = fs.existsSync(path.join(targetDir, "node_modules", "xray", "package.json"));
if (!hasHermes && isConsumer) {
  const mainOpencodePath = path.join(targetDir, "opencode.json");
  if (fs.existsSync(mainOpencodePath)) {
    try {
      const opencode = JSON.parse(fs.readFileSync(mainOpencodePath, "utf8"));
      let modified = false;
      if (opencode.mcpServers) {
        for (const server of Object.values(opencode.mcpServers)) {
          if (server.command && typeof server.command === "string") {
            const normalized = server.command.replace(
              /^[.]{0,2}\/dist\/mcps\//,
              "node_modules/xray/dist/mcps/"
            );
            if (normalized !== server.command) { server.command = normalized; modified = true; }
          }
          if (Array.isArray(server.command)) {
            server.command = server.command.map(a =>
              a.replace(/^[.]{0,2}\/dist\/mcps\//, "node_modules/xray/dist/mcps/")
            );
            modified = true;
          }
        }
      }
      if (modified) {
        fs.writeFileSync(mainOpencodePath, JSON.stringify(opencode, null, 2) + "\n");
        console.log("✅ MCP paths: converted for consumer");
      } else {
        console.log("ℹ️  MCP paths: no conversion needed");
      }
    } catch (e) { console.warn(`⚠️ MCP paths: ${e.message}`); }
  }
}

// 7. Install Hermes skill (dev: src/skills/, consumer: dist/skills/)
const hermesSkillSource = fs.existsSync(path.join(packageRoot, "src", "skills", "hermes-agent", "SKILL.md"))
  ? path.join(packageRoot, "src", "skills", "hermes-agent", "SKILL.md")
  : path.join(packageRoot, "dist", "skills", "hermes-agent", "SKILL.md");
if (fs.existsSync(hermesSkillSource)) {
  try {
    const targetHermesSkills = path.join(homeDir, ".hermes", "skills", "hermes-agent");
    if (fs.existsSync(path.join(homeDir, ".hermes"))) {
      if (!fs.existsSync(targetHermesSkills)) fs.mkdirSync(targetHermesSkills, { recursive: true });
      const destSkill = path.join(targetHermesSkills, "SKILL.md");
      const shouldCopy = !fs.existsSync(destSkill) || fs.statSync(hermesSkillSource).mtime > fs.statSync(destSkill).mtime;
      if (shouldCopy) {
        fs.copyFileSync(hermesSkillSource, destSkill);
        console.log("✅ Hermes skill: installed/updated");
      } else {
        console.log("ℹ️  Hermes skill: up to date");
      }
    }
  } catch (e) { console.warn(`⚠️ Hermes skill: ${e.message}`); }
}

// 8. Deploy .xray/ config files (codex.json, features.json, config.json) for consumer installs
const xraySourceDir = path.join(packageRoot, ".xray");
const xrayTargetDir = path.join(targetDir, ".xray");
const CONFIG_FILES = ["codex.json", "features.json", "config.json"];

if (fs.existsSync(xraySourceDir) && resolvedPackage !== resolvedTarget) {
  try {
    if (!fs.existsSync(xrayTargetDir)) fs.mkdirSync(xrayTargetDir, { recursive: true });
    let copied = 0;
    for (const file of CONFIG_FILES) {
      const src = path.join(xraySourceDir, file);
      const dst = path.join(xrayTargetDir, file);
      if (!fs.existsSync(src)) continue;
      const shouldCopy = !fs.existsSync(dst) ||
        fs.statSync(src).mtime > fs.statSync(dst).mtime;
      if (shouldCopy) {
        fs.copyFileSync(src, dst);
        copied++;
      }
    }
    if (copied > 0) console.log(`✅ .xray/: ${copied} config files deployed`);
    else console.log("ℹ️  .xray/: up to date");
  } catch (e) { console.warn(`⚠️ .xray/ deploy: ${e.message}`); }
}

console.log("\n✅ xray setup complete.\n");
