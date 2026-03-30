/**
 * Test Module Script
 * Simple validation script to test StringRay framework
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directory
const TEST_DIR = join(__dirname, 'test-output');
const TEST_FILE = join(TEST_DIR, 'sample-module.ts');
const TEST_FILE_TEST = join(TEST_DIR, 'sample-module.test.ts');

function setup() {
  console.log('🔧 Setting up test environment...');
  
  // Clean up previous test
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  
  mkdirSync(TEST_DIR, { recursive: true });
  console.log('✅ Test directory created');
}

function createTestFile() {
  console.log('📝 Creating test source file...');
  
  const content = `/**
 * Sample module for testing
 */

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  static multiply(a: number, b: number): number {
    return a * b;
  }
}
`;

  writeFileSync(TEST_FILE, content);
  console.log('✅ Test file created:', TEST_FILE);
}

function verifyTestGenerated() {
  console.log('🔍 Checking for generated test file...');
  
  if (existsSync(TEST_FILE_TEST)) {
    console.log('✅ Test file auto-generated:', TEST_FILE_TEST);
    return true;
  } else {
    console.log('⚠️ Test file not generated (may require OpenCode to be running)');
    return false;
  }
}

function cleanup() {
  console.log('🧹 Cleaning up...');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  console.log('✅ Cleanup complete');
}

async function main() {
  console.log('\n========================================');
  console.log('🧪 StringRay Test Module Script');
  console.log('========================================\n');
  
  try {
    setup();
    createTestFile();
    
    // Wait briefly for framework to potentially generate test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testGenerated = verifyTestGenerated();
    
    console.log('\n========================================');
    console.log('📊 Results:');
    console.log('   Test File:', existsSync(TEST_FILE) ? '✅ Created' : '❌ Failed');
    console.log('   Test Generated:', testGenerated ? '✅ Yes' : '⚠️ No');
    console.log('========================================\n');
    
    cleanup();
    
    process.exit(testGenerated ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error);
    cleanup();
    process.exit(1);
  }
}

main();
