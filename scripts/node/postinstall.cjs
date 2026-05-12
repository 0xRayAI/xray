#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.join(__dirname, "..", "..");

let targetDir;
if (__dirname.includes("node_modules/strray-ai")) {
  targetDir = path.join(__dirname, "..", "..", "..", "..");
} else {
  targetDir = process.env.PWD || process.cwd();
}

const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);

const MERGE_FILES = new Set(["strray/features.json", "enforcer-config.json"]);
const SKIP_DIRS = new Set(["node_modules", "logs"]);
const KEEP_IF_EXISTS = new Set([".yml", ".yaml", ".md"]); // agent configs, commands, workflows

function deepMerge(src, dest) {
  if (typeof src !== "object" || src === null) return dest !== undefined ? dest : src;
  if (Array.isArray(src)) return Array.isArray(dest) ? dest : src;
  const result = {};
  for (const key of Object.keys(src)) {
    result[key] = dest && typeof dest[key] !== "undefined" ? deepMerge(src[key], dest[key]) : src[key];
  }
  if (dest && typeof dest === "object") {
    for (const key of Object.keys(dest)) {
      if (!(key in src)) result[key] = dest[key];
    }
  }
  return result;
}

// Copy .opencode/ to consumer project (source of truth built during npm run build)
const opencodeSource = path.join(packageRoot, ".opencode");
const opencodeDest = path.join(targetDir, ".opencode");

if (fs.existsSync(opencodeSource) && resolvedPackage !== resolvedTarget) {
  function copyDir(src, dest, relPath = "") {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      const rel = path.join(relPath, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath, rel);
      } else if (MERGE_FILES.has(rel)) {
        try {
          const srcData = JSON.parse(fs.readFileSync(srcPath, "utf8"));
          if (fs.existsSync(destPath)) {
            const destData = JSON.parse(fs.readFileSync(destPath, "utf8"));
            fs.writeFileSync(destPath, JSON.stringify(deepMerge(srcData, destData), null, 2));
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch {
          fs.copyFileSync(srcPath, destPath);
        }
      } else if (KEEP_IF_EXISTS.has(path.extname(srcPath)) && fs.existsSync(destPath)) {
        // Skip agent YAMLs, commands, workflows if consumer has customized them
        continue;
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  copyDir(opencodeSource, opencodeDest);
}

// Copy .strray/ to consumer project (incremental: only new files)
const strraySource = path.join(packageRoot, ".strray");
const strrayDest = path.join(targetDir, ".strray");

if (fs.existsSync(strraySource)) {
  const resolvedStrraySource = path.resolve(strraySource);
  const resolvedStrrayDest = path.resolve(strrayDest);
  if (resolvedStrraySource !== resolvedStrrayDest) {
    function copyNewFiles(s, d) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
        const srcPath = path.join(s, entry.name);
        const destPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          copyNewFiles(srcPath, destPath);
        } else if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
    copyNewFiles(strraySource, strrayDest);
  }
}

// Copy AGENTS-consumer.md → AGENTS.md
const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
const agentsDest = path.join(targetDir, "AGENTS.md");
if (fs.existsSync(agentsConsumer) && resolvedPackage !== resolvedTarget) {
  fs.copyFileSync(agentsConsumer, agentsDest);
}

if (resolvedPackage !== resolvedTarget) {
  console.log("✅ 0xRay framework installed. Run `npx strray-ai setup` for full configuration (hooks, Hermes, symlinks).");
}
