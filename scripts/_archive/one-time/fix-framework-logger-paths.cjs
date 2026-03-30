#!/usr/bin/env node

/**
 * Fix Framework Logger Paths Script
 * 
 * Fixes incorrect framework-logger import paths throughout the codebase
 * Replaces ../../framework-logger with ../../core/framework-logger
 * 
 * ⚠️ WARNING: This script modifies source files!
 * Run with --force flag to execute: node fix-framework-logger-paths.cjs --force
 */

const fs = require('fs');
const path = require('path');

// Safety check - require --force flag
if (!process.argv.includes('--force')) {
  console.log('⚠️  This script MODIFIES source files.');
  console.log('   Run with --force flag to execute:');
  console.log('   node fix-framework-logger-paths.cjs --force');
  process.exit(0);
}

function findFiles(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, pattern));
    } else if (file.match(pattern)) {
      results.push(fullPath);
    }
  }
  
  return results;
}

function fixFrameworkLoggerImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fixed = content.replace(
    /\.\.\/\.\.\/framework-logger/g,
    '../../core/framework-logger'
  );
  
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

console.log('🔧 Fixing framework-logger import paths...');

// Fixed: Use correct path to project src directory
const sourceDir = path.join(__dirname, '..', '..', 'src');
const tsFiles = findFiles(sourceDir, /\.ts$/);

let fixedCount = 0;
for (const file of tsFiles) {
  if (fixFrameworkLoggerImports(file)) {
    fixedCount++;
  }
}

console.log(`\n📊 SUMMARY:`);
console.log(`Files processed: ${tsFiles.length}`);
console.log(`Files fixed: ${fixedCount}`);

if (fixedCount > 0) {
  console.log(`\n✅ Successfully fixed ${fixedCount} framework-logger import paths!`);
} else {
  console.log(`\n✅ No framework-logger import issues found!`);
}