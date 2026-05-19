#!/usr/bin/env node

/**
 * StrRay Consumer Preparation Script
 * Transforms development paths back to consumer paths before publishing
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 StrRay Consumer Preparation: Transforming development paths back to consumer paths...');

// Get the package root (where this script is located)
// Script is in scripts/node/, so package root is two levels up
const packageRoot = path.join(__dirname, "..", "..");


function updatePathsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let updated = false;

    // Transform development paths back to consumer paths
    // Only transform if it's not already a consumer path
    if (content.includes('dist/plugin/mcps/') && !content.includes('node_modules/strray-ai/dist/plugin/mcps/')) {
      content = content.replace(
        /dist\/plugin\/mcps\//g,
        'node_modules/strray-ai/dist/plugin/mcps/'
      );
      updated = true;
    }

    // Transform plugin paths back to consumer format (only the relative dev paths)
    if (content.includes('../../../dist/plugin/')) {
      content = content.replace(
        /\.\.\/\.\.\/\.\.\/dist\/plugin\//g,
        'node_modules/strray-ai/dist/plugin/'
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated paths in ${path.relative(packageRoot, filePath)}`);
    } else {
      console.log(`ℹ️ No development paths found in ${path.relative(packageRoot, filePath)}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not update paths in ${filePath}:`, error.message);
  }
}

// Files to update for consumer preparation
// Config loaded from opencode.json in project root
const filesToUpdate = [
  "opencode.json"
];

// Sync .strray/ from .opencode/strray/ so headless consumers get framework defaults
function syncStrrayDir() {
  console.log("🔧 Syncing .strray/ from .opencode/strray/...");
  const strrayDir = path.join(packageRoot, ".strray");
  const sourceDir = path.join(packageRoot, ".opencode", "strray");

  if (!fs.existsSync(sourceDir)) {
    console.warn("⚠️ .opencode/strray/ not found — skipping .strray/ sync");
    return;
  }

  fs.mkdirSync(strrayDir, { recursive: true });

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  let synced = 0;
  for (const entry of entries) {
    if (entry.isFile()) {
      const src = path.join(sourceDir, entry.name);
      const dst = path.join(strrayDir, entry.name);
      fs.copyFileSync(src, dst);
      synced++;
    }
  }

  // Also copy routing-mappings.json if it exists in strray/
  const routingMappings = path.join(packageRoot, "strray", "routing-mappings.json");
  if (fs.existsSync(routingMappings)) {
    fs.copyFileSync(routingMappings, path.join(strrayDir, "routing-mappings.json"));
    synced++;
  }

  console.log(`✅ Synced ${synced} files → .strray/`);
}

syncStrrayDir();

console.log("🔧 StrRay Consumer Preparation: Processing configuration files...");
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(packageRoot, filePath);
  if (fs.existsSync(fullPath)) {
    updatePathsInFile(fullPath);
  } else {
    console.log(`ℹ️ Skipping ${filePath} (not found)`);
  }
});

// Add .js extensions to dist/ folder imports for ES module compatibility
function addJsExtensionsToDist() {
  console.log("🔧 Adding .js extensions to dist/ folder imports...");
  
  const distPath = path.join(packageRoot, "dist");
  
  if (!fs.existsSync(distPath)) {
    console.warn("⚠️ dist/ folder not found. Run npm run build first.");
    return;
  }
  
  let modifiedCount = 0;
  
  function processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      
      // Add .js extension to relative imports that don't have it
      // Match: from "../path/module" but not from "../path/module.js"
      content = content.replace(/from "(\.[./][^"]+)";/g, (match, importPath) => {
        // Skip if already has .js extension
        if (importPath.endsWith('.js')) return match;
        // Skip if it's a directory import (ends with /)
        if (importPath.endsWith('/')) return match;
        // Add .js extension
        return `from "${importPath}.js";`;
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        modifiedCount++;
        console.log(`✅ Fixed: ${path.relative(distPath, filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        processFile(fullPath);
      }
    }
  }
  
  walkDir(distPath);
  console.log(`🎉 Added .js extensions to ${modifiedCount} files in dist/`);
}

// Run the dist transformation
addJsExtensionsToDist();

console.log("🎉 StrRay Consumer Preparation: Complete!");
console.log("📦 Package is now ready for consumer installation.");