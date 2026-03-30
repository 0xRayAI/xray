#!/usr/bin/env node

/**
 * Remove Version Headers Script
 * 
 * Removes "StringRay AI vX.X.X - " prefix from file headers in src/
 * Keeps only the description part
 * Skips src/cli/index.ts and other entry points
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, '..', '..', 'src');
const VERSION_PATTERN = /StringRay AI v\d+\.\d+\.\d+\s*-\s*/;

// Files to skip
const SKIP_FILES = [
  'src/cli/index.ts',
  'src/index.ts'
];

// Check if file is an index.ts (module entry point)
function isIndexFile(filePath) {
  return basename(filePath) === 'index.ts';
}

// Check if file should be skipped
function shouldSkip(filePath) {
  const relativePath = relative(join(__dirname, '..', '..'), filePath);
  
  // Skip explicitly listed files
  if (SKIP_FILES.some(skip => relativePath.includes(skip))) {
    return true;
  }
  
  // Skip all index.ts files (module entry points)
  if (isIndexFile(filePath)) {
    return true;
  }
  
  return false;
}

// Recursively get all .ts files
function getTsFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      getTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !shouldSkip(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Clean version header from file
function cleanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  
  // Look for version pattern in the first 10 lines (usually in header comments)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    if (VERSION_PATTERN.test(line)) {
      // Remove the version prefix, keep the description
      const newLine = line.replace(VERSION_PATTERN, '');
      
      // Clean up any double spaces that might result
      lines[i] = newLine.replace(/\s{2,}/g, ' ');
      modified = true;
      break; // Only process first occurrence
    }
  }
  
  if (modified) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Scanning for version headers in src/...\n');

const files = getTsFiles(SRC_DIR);
let cleanedCount = 0;
let skippedCount = 0;

console.log(`Found ${files.length} TypeScript files to process\n`);

for (const file of files) {
  const relativePath = relative(SRC_DIR, file);
  
  try {
    if (cleanFile(file)) {
      console.log(`✅ Cleaned: ${relativePath}`);
      cleanedCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${relativePath}: ${error.message}`);
    skippedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Files cleaned: ${cleanedCount}`);
console.log(`   Files skipped (errors): ${skippedCount}`);
console.log(`   Total processed: ${files.length}`);
console.log(`\n✨ Version header cleanup complete!`);
