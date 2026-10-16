#!/usr/bin/env node

/**
 * xray Development Environment Setup
 * Transforms consumer-oriented paths to development paths for local development
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 xray Development Setup: Transforming consumer paths to development paths...');

// Get the package root (where this script is located)
const packageRoot = path.join(__dirname, "../..");

function updatePathsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let updated = false;

    // npm installs at node_modules/0xray. node_modules/xray is the pre-rename folder.
    // Specific plugin paths first so the general dist/ strip does not flatten them.
    for (const dirName of ['0xray', 'xray']) {
      const plugins = `node_modules/${dirName}/dist/plugin/plugins/`;
      if (content.includes(plugins)) {
        content = content.replaceAll(plugins, '../../../dist/plugin/plugins/');
        updated = true;
      }
      const mcps = `node_modules/${dirName}/dist/plugin/mcps/`;
      if (content.includes(mcps)) {
        content = content.replaceAll(mcps, 'dist/plugin/mcps/');
        updated = true;
      }
      const prefix = `node_modules/${dirName}/dist/`;
      if (content.includes(prefix)) {
        content = content.replaceAll(prefix, 'dist/');
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated paths in ${path.relative(packageRoot, filePath)}`);
    } else {
      console.log(`ℹ️ No paths to update in ${path.relative(packageRoot, filePath)}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not update paths in ${filePath}:`, error.message);
  }
}

// Files to update for development
// Config loaded from opencode.json in project root
const filesToUpdate = [
  ".mcp.json",
  "opencode.json"
];

console.log("🔧 xray Development Setup: Processing configuration files...");
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(packageRoot, filePath);
  updatePathsInFile(fullPath);
});

console.log("🎉 xray Development Setup: Complete!");
console.log("📋 Next steps:");
console.log("1. Run 'npm run build:all' to build the framework");
console.log("2. Restart OpenCode to load the plugin");
console.log("3. Run 'opencode agent list' to see xray agents");
console.log("4. Try '@architect analyze this code' or '@security-auditor scan' to test");