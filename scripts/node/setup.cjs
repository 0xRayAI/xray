#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function syncSetupSkillsAndRootLinks(packageRoot, targetDir) {
  // Mint fastens mill and inspect. The role-skill mirror stays in the package.

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

}

module.exports = { syncSetupSkillsAndRootLinks };

if (require.main === module) {
const packageRoot = path.join(__dirname, "..", "..");
const homeDir = require("os").homedir();

const {
  resolveConsumerTargetDir,
  isConsumerInstall,
  deployXrayConfig,
} = require("./install-bridges.cjs");
let targetDir = resolveConsumerTargetDir(
  packageRoot,
  process.env.INIT_CWD || process.env.PWD || process.cwd(),
);

const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);

console.log("🔧 xray Setup: Full configuration...\n");

const hasHermes = fs.existsSync(path.join(targetDir, ".hermes")) &&
  fs.lstatSync(path.join(targetDir, ".hermes")).isDirectory();

if (hasHermes) {
  console.log("🔍 Hermes Agent detected");
}

// Mint fastens mill and inspect. The links below are scripts and dist.
syncSetupSkillsAndRootLinks(packageRoot, targetDir);

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

// 6. Convert MCP paths in consumer opencode.json
const isConsumer = isConsumerInstall(packageRoot, targetDir);
const consumerPkgName = isConsumer
  ? ["0xray", "xray"].find((name) =>
      fs.existsSync(path.join(targetDir, "node_modules", name, "package.json"))
    )
  : null;
if (!hasHermes && isConsumer && consumerPkgName) {
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
              `node_modules/${consumerPkgName}/dist/mcps/`
            );
            if (normalized !== server.command) { server.command = normalized; modified = true; }
          }
          if (Array.isArray(server.command)) {
            server.command = server.command.map(a =>
              a.replace(/^[.]{0,2}\/dist\/mcps\//, `node_modules/${consumerPkgName}/dist/mcps/`)
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

// 8. Deploy .xray/ config files (codex.json, features.json, features.schema.json, config.json)
if (resolvedPackage !== resolvedTarget) {
  try {
    const deployed = deployXrayConfig(targetDir, packageRoot, () => {});
    if (deployed > 0) console.log(`✅ .xray/: ${deployed} config files deployed`);
    else console.log("ℹ️  .xray/: up to date");
  } catch (e) {
    console.warn(`⚠️ .xray/ deploy: ${e.message}`);
  }
}

console.log("\n✅ xray setup complete.\n");
}
