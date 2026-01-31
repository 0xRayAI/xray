#!/usr/bin/env node

/**
 * Fix Framework Logger Paths Script
 * 
 * Fixes incorrect framework-logger import paths throughout the codebase
 * Replaces ../../framework-logger with ../../core/framework-logger
 */

const fs = require('fs');
const path = require('path');

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

const sourceDir = path.join(__dirname, '..', 'src');
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