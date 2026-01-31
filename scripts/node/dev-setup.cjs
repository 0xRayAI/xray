#!/usr/bin/env node

/**
 * Dev Environment Setup
 * Adds .js extensions to dist/ folder imports for ES module compatibility in dev environment
 * This is only for development - consumers get this via post-install transformation
 */

const fs = require("fs");
const path = require("path");

console.log('🔧 Dev Setup: Adding .js extensions to dist/ imports...');

const distPath = path.join(__dirname, "..", "..", "dist");

if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ folder not found. Run npm run build first.');
  process.exit(1);
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

console.log(`\n🎉 Dev Setup Complete!`);
console.log(`   Modified ${modifiedCount} files in dist/`);
console.log(`   ES module imports now have .js extensions`);
console.log(`\n📋 You can now run scripts that import from dist/`);
