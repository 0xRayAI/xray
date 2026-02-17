#!/usr/bin/env node

/**
 * StrRay Plugin Post-Installation Setup
 * Copies configuration files to project root and updates paths
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 StrRay Postinstall: Script starting...');

// Find the package root relative to this script
const packageRoot = path.join(__dirname, "..", "..");

// Get the consumer directory - npm changes to node_modules/<package> during postinstall
// We need to find the parent of node_modules/<package>
// The script is at: <consumer>/node_modules/strray-ai/scripts/node/postinstall.cjs
// So we need to go up: scripts/node -> strray-ai -> node_modules -> <consumer>
let targetDir;

// Check if we're in node_modules (normal npm install)
if (__dirname.includes("node_modules/strray-ai")) {
  // Go up from scripts/node to node_modules/strray-ai to consumer root
  targetDir = path.join(__dirname, "..", "..", "..", "..");
} else {
  // Fallback: use PWD or cwd
  targetDir = process.env.PWD || process.cwd();
}

console.log("🔧 StrRay Postinstall: Script directory:", __dirname);
console.log("🔧 StrRay Postinstall: Package root:", packageRoot);
console.log("🔧 StrRay Postinstall: Consumer directory:", targetDir);
console.log("🔧 StrRay Postinstall: Current working dir:", process.cwd());

// Configuration files to copy during installation
const configFiles = [
  // ".mcp.json", // Refactored out - MCP config now in opencode.json
  "opencode.json",
  "AGENTS.md"
];

// Directories to copy recursively
const configDirs = [
  ".opencode"
];

console.log("🔧 StrRay Postinstall: Copying configuration files...");
console.log("📍 Package root:", packageRoot);
console.log("📍 Target directory:", targetDir);

// Copy individual files
configFiles.forEach(filePath => {
  const source = path.join(packageRoot, filePath);
  const dest = path.join(targetDir, filePath);

  try {
    if (fs.existsSync(source)) {
      // Ensure destination directory exists
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Created directory: ${destDir}`);
      }

      fs.copyFileSync(source, dest);
      console.log(`✅ Copied ${filePath}`);
    } else {
      console.warn(`⚠️ Source not found: ${source}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy ${filePath}:`, error.message);
  }
});

// Copy directories recursively
configDirs.forEach(dirPath => {
  const sourceDir = path.join(packageRoot, dirPath);
  const destDir = path.join(targetDir, dirPath);

  if (fs.existsSync(sourceDir)) {
    try {
      // Recursive copy function
      function copyDir(src, dest) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(sourceDir, destDir);
      console.log(`✅ Copied directory ${dirPath}`);
    } catch (error) {
      console.warn(`⚠️ Could not copy directory ${dirPath}:`, error.message);
    }
  } else {
    console.warn(`⚠️ Source directory not found: ${sourceDir}`);
  }
});

// Detect if we're in a consumer environment (installed via npm)
// Check both the target directory and current working directory
const cwd = process.cwd();
const isConsumerEnvironment = !targetDir.includes("dev/stringray") && !targetDir.includes("stringray");

// Convert paths for consumer environment
if (isConsumerEnvironment) {
  console.log("🔧 StrRay Postinstall: Converting paths for consumer environment...");

  // Note: .mcp.json was refactored out - no longer need to update MCP paths
  // See AGENTS.md for details

// Convert plugin paths in opencode.json
const mainOpencodePath = path.join(targetDir, "opencode.json");
  if (fs.existsSync(mainOpencodePath)) {
    let opencodeContent = fs.readFileSync(mainOpencodePath, "utf8");
    // Handle various plugin path patterns
    opencodeContent = opencodeContent.replace(
      /"strray\/dist\/plugin\/strray-codex-injection\.js"/g,
      '"node_modules/strray-ai/dist/plugin/strray-codex-injection.js"'
    );
    opencodeContent = opencodeContent.replace(
      /"src\/plugin\/strray-codex-injection\.ts"/g,
      '"node_modules/strray-ai/dist/plugin/strray-codex-injection.js"'
    );
    // Convert MCP server paths (mcpServers use command array)
    // Note: MCP servers are in dist/mcps/ NOT dist/plugin/mcps/
    opencodeContent = opencodeContent.replace(
      /"\.\.?\/dist\/mcps\//g,
      '"node_modules/strray-ai/dist/mcps/'
    );
    fs.writeFileSync(mainOpencodePath, opencodeContent, "utf8");
    console.log("✅ Updated plugin and MCP paths in opencode.json");
  }
}

console.log("🔧 StrRay Postinstall: Consumer installation complete - all paths are correctly configured.");

// Create symlink to .strray directory for persistent state
const strraySource = path.join(packageRoot, '.strray');
const strrayDest = path.join(targetDir, '.strray');

if (fs.existsSync(strraySource) && !fs.existsSync(strrayDest)) {
  try {
    fs.symlinkSync(strraySource, strrayDest, 'dir');
    console.log(`✅ .strray directory symlinked`);
  } catch (error) {
    console.error(`❌ Failed to symlink .strray:`, error.message);
    // Fallback: copy the directory
    try {
      function copyDir(src, dest) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
      copyDir(strraySource, strrayDest);
      console.log(`✅ .strray directory copied (fallback)`);
    } catch (copyError) {
      console.error(`❌ Failed to copy .strray:`, copyError.message);
    }
  }
}

console.log("🎉 StrRay Postinstall: Configuration complete!");
console.log("📋 Next steps:");
console.log("1. Restart OpenCode to load the plugin");
console.log("2. Run 'opencode agent list' to see StrRay agents");
console.log("3. Try '@enforcer analyze this code' to test the plugin");