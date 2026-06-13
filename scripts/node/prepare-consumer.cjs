#!/usr/bin/env node

/**
 * xray Consumer Preparation Script (technical)
 * Transforms development paths back to consumer paths before publishing
 * Part of xray v2 shipping package (plain identity).
 */

const fs = require("fs");
const path = require("path");

// Structured logging shim (fwLogger discipline for script context)
function structuredLog(component, action, status, details) {
  const ts = new Date().toISOString();
  const detailsPart = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`${ts} [${component}] ${action} - ${String(status).toUpperCase()}${detailsPart}`);
}

structuredLog('prepare-consumer', 'Transforming development paths back to consumer paths', 'info');

// Get the package root (where this script is located)
// Script is in scripts/node/, so package root is two levels up
const packageRoot = path.join(__dirname, "..", "..");


function updatePathsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      structuredLog('prepare-consumer', `File not found: ${filePath}`, 'warning');
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let updated = false;

    // Transform development paths back to consumer paths.
    // Use 0xray (current published name). Keep xray for any legacy consumer configs.
    // Only transform if it's not already a consumer path.
    if (content.includes('dist/plugin/mcps/') && !content.includes('node_modules/0xray/dist/plugin/mcps/') && !content.includes('node_modules/xray/dist/plugin/mcps/')) {
      content = content.replace(
        /dist\/plugin\/mcps\//g,
        'node_modules/0xray/dist/plugin/mcps/'
      );
      updated = true;
    }

    // Transform plugin paths back to consumer format (only the relative dev paths)
    if (content.includes('../../../dist/plugin/')) {
      content = content.replace(
        /\.\.\/\.\.\/\.\.\/dist\/plugin\//g,
        'node_modules/0xray/dist/plugin/'
      );
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      structuredLog('prepare-consumer', `Updated paths in ${path.relative(packageRoot, filePath)}`, 'success');
    } else {
      structuredLog('prepare-consumer', `No development paths found in ${path.relative(packageRoot, filePath)}`, 'info');
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

structuredLog('prepare-consumer', 'Processing configuration files', 'info');
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(packageRoot, filePath);
  if (fs.existsSync(fullPath)) {
    updatePathsInFile(fullPath);
  } else {
    structuredLog('prepare-consumer', `Skipping ${filePath} (not found)`, 'info');
  }
});

// Add .js extensions to dist/ folder imports for ES module compatibility
function addJsExtensionsToDist() {
  structuredLog('prepare-consumer', 'Adding .js extensions to dist/ folder imports', 'info');
  
  const distPath = path.join(packageRoot, "dist");
  
  if (!fs.existsSync(distPath)) {
    structuredLog('prepare-consumer', 'dist/ folder not found. Run npm run build first.', 'warning');
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
        structuredLog('prepare-consumer', `Fixed: ${path.relative(distPath, filePath)}`, 'success');
      }
    } catch (error) {
      structuredLog('prepare-consumer', `Error processing ${filePath}: ${error.message}`, 'error');
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
  structuredLog('prepare-consumer', `Added .js extensions to ${modifiedCount} files in dist/`, 'success');
}

// Run the dist transformation
addJsExtensionsToDist();

structuredLog('prepare-consumer', 'xray v3 Consumer Preparation: Complete!', 'success');
structuredLog('prepare-consumer', 'Package is now ready for consumer installation (plain xray technical identity).', 'info');
