#!/usr/bin/env node

/**
 * CI Path Setup Script
 *
 * Converts consumer-relative paths to development paths for CI environment
 * This is the opposite of the postinstall script - it prepares paths for
 * running from the source directory instead of an installed package.
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 CI Path Setup: Converting to development paths...');

// Files that need path conversion for CI
// Config loaded from opencode.json in project root
const filesToUpdate = [
  '.mcp.json'
];

function convertPathsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let updated = false;

  // Convert consumer plugin paths to development paths
  if (content.includes('../../../dist/plugin/plugins/')) {
    content = content.replace(
      /"\.\.\/\.\.\/\.\.\/dist\/plugin\/plugins\/[^"]*"/g,
      (match) => match.replace('../../../', '')
    );
    updated = true;
  }

  // Convert consumer MCP server paths to development paths
  if (content.includes('node_modules/strray-ai/dist/plugin/mcps/')) {
    content = content.replace(
      /"node_modules\/strray-ai\/dist\/plugin\/mcps\/[^"]*"/g,
      (match) => match.replace('node_modules/strray-ai/', '')
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated paths in ${filePath}`);
  } else {
    console.log(`ℹ️ No path updates needed in ${filePath}`);
  }
}

console.log('📍 Converting paths for CI environment...');

filesToUpdate.forEach(convertPathsInFile);

console.log('🎉 CI Path Setup: Development paths configured!');
console.log('📋 CI environment ready for testing.');