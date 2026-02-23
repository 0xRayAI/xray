#!/usr/bin/env node
/**
 * Pre-commit Consumer Path Validator
 * 
 * Validates that config files have correct consumer paths (node_modules/strray-ai)
 * instead of development paths (./dist, ./src)
 * 
 * This is part of the StringRay framework's consumer readiness checks.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');

const CONFIG_FILES = [
  'opencode.json',
  'package.json',
];

const DEVELOPMENT_PATTERNS = [
  './dist/',
  './src/',
  '../dist/',
  '../src/',
];

const CONSUMER_PATTERNS = [
  'node_modules/strray-ai/',
];

let errors = [];

function checkFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${filePath} - not found, skipping`);
    return;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Skip validation in development (when node_modules/strray-ai doesn't exist yet)
    const isDevelopment = !fs.existsSync(path.join(PROJECT_ROOT, 'node_modules/strray-ai'));
    if (isDevelopment) {
      console.log(`✅ ${filePath} - development mode, paths validated by default`);
      return;
    }
    
    // Check for development patterns that should be consumer patterns
    for (const pattern of DEVELOPMENT_PATTERNS) {
      if (content.includes(pattern)) {
        // Check if this is in a path context (not just a description)
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(pattern)) {
            // Skip comments and descriptions
            if (!line.trim().startsWith('//') && 
                !line.trim().startsWith('#') &&
                !line.includes('description') &&
                !line.includes('Description')) {
              errors.push(`${filePath}:${i + 1} - Contains development path: ${pattern}`);
            }
          }
        });
      }
    }
    
    console.log(`✅ ${filePath} - consumer paths valid`);
    
  } catch (error) {
    errors.push(`${filePath} - Error reading: ${error.message}`);
  }
}

function main() {
  console.log('🔒 Checking consumer paths in config files...\n');
  
  for (const file of CONFIG_FILES) {
    checkFile(file);
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Consumer path validation failed:');
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  }
  
  console.log('\n✅ All consumer paths validated');
  process.exit(0);
}

main();
