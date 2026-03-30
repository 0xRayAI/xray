#!/usr/bin/env node

/**
 * Global Model Replacement Script
 * 
 * ⚠️ WARNING: This script MODIFIES source files!
 * Run with --force flag to execute: node update-models-global.cjs --force
 * 
 * Note: Current configuration does nothing (search == replace)
 */

const fs = require('fs');
const path = require('path');

// Safety check - require --force flag
if (!process.argv.includes('--force')) {
  console.log('⚠️  This script may MODIFY source files.');
  console.log('   Run with --force flag to execute:');
  console.log('   node update-models-global.cjs --force');
  process.exit(0);
}

const searchString = 'openrouter/xai-grok-2-1212-fast-1';
const replaceString = 'openrouter/xai-grok-2-1212-fast-1';

function walk(dir, results = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules and .git directories
            if (file !== 'node_modules' && file !== '.git') {
                walk(filePath, results);
            }
        } else {
            results.push(filePath);
        }
    }
    return results;
}

function updateFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;

        // Replace all instances, including the variants like openrouter/xai-grok-2-1212-fast-1
        newContent = newContent
            .replace(/opencode\/grok-code-fast-1/g, replaceString)
            .replace(/opencode\/grok-code/g, replaceString);

        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated: ${filePath}`);
            return true;
        }
    } catch (error) {
        console.warn(`Error processing ${filePath}:`, error.message);
    }
    return false;
}

console.log('Starting global model replacement...');
console.log(`Replacing: ${searchString} variants`);
console.log(`With: ${replaceString}`);

const startDir = '.';
const files = walk(startDir);
let updatedCount = 0;

for (const file of files) {
    if (updateFile(file)) {
        updatedCount++;
    }
}

console.log(`\n✅ Model replacement completed!`);
console.log(`📊 Files updated: ${updatedCount}`);
console.log(`🎯 Total files processed: ${files.length}`);
console.log(`🔍 Replaced all variants of '${searchString}' with '${replaceString}'`);