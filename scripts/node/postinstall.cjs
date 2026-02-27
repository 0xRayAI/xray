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
  "AGENTS-consumer.md:AGENTS.md"  // Minimal version for consumers
];

// Copy .opencode directory recursively
const opencodeSource = path.join(packageRoot, '.opencode');
const opencodeDest = path.join(targetDir, '.opencode');

if (fs.existsSync(opencodeSource)) {
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
    copyDir(opencodeSource, opencodeDest);
    console.log(`✅ Copied directory .opencode`);
  } catch (error) {
    console.warn(`⚠️ Could not copy directory .opencode:`, error.message);
  }
}

console.log("🔧 StrRay Postinstall: Copying configuration files...");
console.log("📍 Package root:", packageRoot);
console.log("📍 Target directory:", targetDir);

// Copy individual files
configFiles.forEach(fileMapping => {
  // Handle "source:destination" format for renames
  const [sourceFile, destFile] = fileMapping.split(':');
  const source = path.join(packageRoot, sourceFile);
  const dest = path.join(targetDir, destFile || sourceFile);

  try {
    if (fs.existsSync(source)) {
      // Ensure destination directory exists
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Created directory: ${destDir}`);
      }

      fs.copyFileSync(source, dest);
      console.log(`✅ Copied ${sourceFile} → ${destFile || sourceFile}`);
    } else {
      console.warn(`⚠️ Source not found: ${source}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy ${fileMapping}:`, error.message);
  }
});

// Create symlink to scripts directory for post-processor monitoring
const scriptsSource = path.join(packageRoot, 'scripts');
const scriptsDest = path.join(targetDir, 'scripts');

if (fs.existsSync(scriptsSource)) {
  try {
    if (fs.existsSync(scriptsDest)) {
      const stats = fs.lstatSync(scriptsDest);
      if (stats.isSymbolicLink()) {
        console.log(`✅ scripts symlink already exists`);
      } else {
        console.log(`⚠️ scripts exists but is not a symlink`);
      }
    } else {
      fs.symlinkSync(scriptsSource, scriptsDest, 'dir');
      console.log(`✅ Created scripts symlink → node_modules/strray-ai/scripts`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not create scripts symlink:`, error.message);
  }
}

// Detect if we're in a consumer environment (installed via npm)
// Check both the target directory and current working directory
const cwd = process.cwd();
const isConsumerEnvironment = !targetDir.includes("dev/stringray") && !targetDir.includes("stringray");

// Convert paths for consumer environment
if (isConsumerEnvironment) {
  console.log("🔧 StrRay Postinstall: Converting paths for consumer environment...");

  // Note: .mcp.json was refactored out - no longer need to update MCP paths
  // Note: "plugin" config is for npm packages only - local plugins go in .opencode/plugin/
  // See OpenCode docs: https://opencode.ai/docs/config/#plugins
  // So we don't need to update plugin paths in opencode.json anymore

// Convert MCP server paths only (not plugin paths - those are for npm packages)
// Note: MCP servers are in dist/mcps/ NOT dist/plugin/mcps/
const mainOpencodePath = path.join(targetDir, "opencode.json");
  if (fs.existsSync(mainOpencodePath)) {
    let opencodeContent = fs.readFileSync(mainOpencodePath, "utf8");
    // Convert MCP server paths (mcpServers use command array)
    opencodeContent = opencodeContent.replace(
      /"\.\.?\/dist\/mcps\//g,
      '"node_modules/strray-ai/dist/mcps/'
    );
    fs.writeFileSync(mainOpencodePath, opencodeContent, "utf8");
    console.log("✅ Updated MCP paths in opencode.json");
  }
}

console.log("🔧 StrRay Postinstall: Consumer installation complete - all paths are correctly configured.");

// Create symlink to .strray directory for persistent state
const strraySource = path.join(packageRoot, '.strray');
const strrayDest = path.join(targetDir, '.strray');

if (fs.existsSync(strraySource)) {
  try {
    // Check if .strray already exists
    if (fs.existsSync(strrayDest)) {
      const stats = fs.lstatSync(strrayDest);
      
      if (stats.isSymbolicLink()) {
        // It's a symlink - check if it points to the right location
        const existingTarget = fs.readlinkSync(strrayDest);
        if (existingTarget === strraySource) {
          console.log(`✅ .strray symlink already exists and is correct`);
        } else {
          // Symlink exists but points to wrong location - remove and recreate
          console.log(`📝 Updating .strray symlink to point to new location...`);
          fs.unlinkSync(strrayDest);
          fs.symlinkSync(strraySource, strrayDest, 'dir');
          console.log(`✅ .strray directory symlinked (updated)`);
        }
      } else if (stats.isDirectory()) {
        // It's a regular directory - backup and create symlink
        const backupName = `.strray.backup.${Date.now()}`;
        console.log(`📝 Backing up existing .strray directory to ${backupName}...`);
        fs.renameSync(strrayDest, path.join(targetDir, backupName));
        fs.symlinkSync(strraySource, strrayDest, 'dir');
        console.log(`✅ .strray directory symlinked (backed up existing)`);
      }
    } else {
      // .strray doesn't exist - create symlink
      fs.symlinkSync(strraySource, strrayDest, 'dir');
      console.log(`✅ .strray directory symlinked`);
    }
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

// Create symlink to dist for MCP servers that look for "dist/" path
const distSource = path.join(packageRoot, 'dist');
const distDest = path.join(targetDir, 'dist');

if (fs.existsSync(distSource)) {
  try {
    if (fs.existsSync(distDest)) {
      const stats = fs.lstatSync(distDest);
      if (stats.isSymbolicLink()) {
        console.log(`✅ dist symlink already exists`);
      } else {
        console.log(`⚠️ dist exists but is not a symlink - MCP servers may not work correctly`);
      }
    } else {
      fs.symlinkSync(distSource, distDest, 'dir');
      console.log(`✅ Created dist symlink → node_modules/strray-ai/dist`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not create dist symlink:`, error.message);
  }
}

console.log("📋 Next steps:");
console.log("1. Restart OpenCode to load the plugin");
console.log("2. Run 'opencode agent list' to see StrRay agents");
console.log("3. Try '@enforcer analyze this code' to test the plugin");