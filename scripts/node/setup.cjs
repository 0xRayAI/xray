#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.join(__dirname, "..", "..");
const homeDir = require("os").homedir();

let targetDir;
if (__dirname.includes("node_modules/strray-ai")) {
  targetDir = path.join(__dirname, "..", "..", "..", "..");
} else {
  targetDir = process.env.PWD || process.cwd();
}

console.log("🔧 0xRay Setup: Full configuration...\n");

const hasHermes = fs.existsSync(path.join(targetDir, ".hermes")) &&
  fs.lstatSync(path.join(targetDir, ".hermes")).isDirectory();

if (hasHermes) {
  console.log("🔍 Hermes Agent detected");
}

// 1. Sync core skills from src/skills/ (dev) or dist/skills/ (consumer) → .opencode/skills/
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
const pluginSource = path.join(packageRoot, "dist", "plugin", "strray-codex-injection.js");
const pluginDest = path.join(targetDir, ".opencode", "plugin", "strray-codex-injection.js");

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
const isConsumer = fs.existsSync(path.join(targetDir, "node_modules", "strray-ai", "package.json"));
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
              "node_modules/strray-ai/dist/mcps/"
            );
            if (normalized !== server.command) { server.command = normalized; modified = true; }
          }
          if (Array.isArray(server.command)) {
            server.command = server.command.map(a =>
              a.replace(/^[.]{0,2}\/dist\/mcps\//, "node_modules/strray-ai/dist/mcps/")
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
      const shouldCopy = !fs.existsSync(destSkill) ||
        fs.statSync(hermesSkillSource).mtime > fs.statSync(destSkill).mtime;
      if (shouldCopy) {
        fs.copyFileSync(hermesSkillSource, destSkill);
        console.log("✅ Hermes skill: installed");
      } else {
        console.log("ℹ️  Hermes skill: up to date");
      }
    }
  } catch (e) { console.warn(`⚠️ Hermes skill: ${e.message}`); }
}

// 8. Install Hermes plugin (dev: src/integrations/, consumer: dist/integrations/)
const hermesPluginSource = fs.existsSync(path.join(packageRoot, "src", "integrations", "hermes-agent"))
  ? path.join(packageRoot, "src", "integrations", "hermes-agent")
  : path.join(packageRoot, "dist", "integrations", "hermes-agent");
if (fs.existsSync(hermesPluginSource)) {
  try {
    const hermesDir = path.join(homeDir, ".hermes");
    if (fs.existsSync(hermesDir)) {
      const targetPluginDir = path.join(hermesDir, "plugins", "strray-hermes");
      const pluginFiles = [
        "__init__.py", "tools.py", "schemas.py", "plugin.yaml",
        "bridge.mjs", "conftest.py", "after-install.md", "test_plugin.py"
      ];
      let needsUpdate = false;
      if (!fs.existsSync(targetPluginDir)) {
        needsUpdate = true;
      } else {
        for (const file of pluginFiles) {
          const src = path.join(hermesPluginSource, file);
          const dst = path.join(targetPluginDir, file);
          if (fs.existsSync(src) && (!fs.existsSync(dst) ||
              fs.statSync(src).mtime > fs.statSync(dst).mtime)) {
            needsUpdate = true;
            break;
          }
        }
      }
      if (needsUpdate) {
        if (!fs.existsSync(targetPluginDir)) fs.mkdirSync(targetPluginDir, { recursive: true });
        let copied = 0;
        for (const file of pluginFiles) {
          const src = path.join(hermesPluginSource, file);
          if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(targetPluginDir, file)); copied++; }
        }
        console.log(`✅ Hermes plugin: installed (${copied} files)`);
      } else {
        console.log("ℹ️  Hermes plugin: up to date");
      }
    }
  } catch (e) { console.warn(`⚠️ Hermes plugin: ${e.message}`); }
}

// 9. Install git hooks
const hookNames = ["pre-commit", "post-commit", "pre-push", "post-push"];
const hooksSourceDir = path.join(packageRoot, "hooks");

function installGitHooks() {
  const gitDir = path.join(targetDir, ".git");
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    console.log("ℹ️  Git hooks: no .git directory found");
    return;
  }
  const gitHooksDir = path.join(gitDir, "hooks");
  if (!fs.existsSync(gitHooksDir)) fs.mkdirSync(gitHooksDir, { recursive: true });

  let installed = 0, skipped = 0;
  for (const hookName of hookNames) {
    const hookSource = path.join(hooksSourceDir, hookName);
    const hookDest = path.join(gitHooksDir, hookName);
    if (!fs.existsSync(hookSource)) continue;

    if (fs.existsSync(hookDest)) {
      try {
        const destContent = fs.readFileSync(hookDest, "utf8");
        if (destContent.includes("StringRay") || destContent.includes("strray")) {
          if (fs.statSync(hookSource).mtime > fs.statSync(hookDest).mtime) {
            fs.copyFileSync(hookSource, hookDest);
            fs.chmodSync(hookDest, 0o755);
            installed++;
          } else { skipped++; }
          continue;
        }
      } catch {}
      const backupDest = hookDest + ".strray-backup";
      if (!fs.existsSync(backupDest)) {
        fs.copyFileSync(hookDest, backupDest);
        console.log(`📝 Backed up ${hookName} → ${hookName}.strray-backup`);
      }
    }
    fs.copyFileSync(hookSource, hookDest);
    fs.chmodSync(hookDest, 0o755);
    installed++;
  }
  if (installed > 0) console.log(`✅ Git hooks: ${installed} installed (${hookNames.join(", ")})`);
  if (skipped > 0) console.log(`ℹ️  Git hooks: ${skipped} already up to date`);
}

try { installGitHooks(); } catch (e) { console.warn(`⚠️ Git hooks: ${e.message}`); }

console.log("\n📋 Next steps:");
console.log("  1. Restart OpenCode to load the plugin");
console.log("  2. Run 'opencode agent list' to see StrRay agents");
console.log("  3. Try '@architect analyze this code' or '@security-auditor scan'");
console.log("  4. Hermes Agent users: restart Hermes to load MCP tools");
console.log("\n🎉 0xRay setup complete!");
