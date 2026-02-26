#!/usr/bin/env node

/**
 * Test Auto-Creation Flow Test
 * Tests the complete test auto-creation pipeline
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

console.log("🧪 TEST AUTO-CREATION FLOW TEST");
console.log("=================================\n");

let passed = 0;
let failed = 0;

// Test file path
const TEST_FILE = join(PROJECT_ROOT, 'src/utils/auto-creation-test-' + Date.now() + '.ts');
const TEST_FILE_CONTENT = `
/**
 * Auto-created test file
 */
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
`;

const TEST_FILE_EXPECTED = join(PROJECT_ROOT, 'src/utils/auto-creation-test-' + Date.now() + '.test.ts');

function runTest(name, testFn) {
  try {
    testFn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Clean up function
function cleanup() {
  try {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    if (fs.existsSync(TEST_FILE_EXPECTED)) fs.unlinkSync(TEST_FILE_EXPECTED);
  } catch (e) {}
}

process.on('exit', cleanup);

runTest("TestAutoCreationProcessor can be imported", async () => {
  const { testAutoCreationProcessor } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  if (!testAutoCreationProcessor) throw new Error("testAutoCreationProcessor is null");
});

runTest("Test file can be created in src/", () => {
  fs.writeFileSync(TEST_FILE, TEST_FILE_CONTENT);
  if (!fs.existsSync(TEST_FILE)) throw new Error("Test file not created");
});

runTest("Test file contains expected exports", () => {
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  if (!content.includes('export function add')) throw new Error("Missing add export");
  if (!content.includes('export function subtract')) throw new Error("Missing subtract export");
});

runTest("Processor can extract exports from file", async () => {
  const { extractExports } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  const exports = extractExports(content);
  if (!exports || exports.length === 0) throw new Error("No exports extracted");
  if (!exports.some(e => e.name === 'add')) throw new Error("add function not found");
});

runTest("Processor can create test stub", async () => {
  const { createBasicTestStub } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  const testStub = createBasicTestStub(TEST_FILE, content);
  if (!testStub || testStub.length === 0) throw new Error("Test stub not created");
  if (!testStub.includes('describe')) throw new Error("Test stub missing describe");
});

runTest("Test stub contains test for add function", async () => {
  const { createBasicTestStub } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  const testStub = createBasicTestStub(TEST_FILE, content);
  if (!testStub.includes('add')) throw new Error("Test stub missing add test");
});

runTest("Test stub contains test for subtract function", async () => {
  const { createBasicTestStub } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  const content = fs.readFileSync(TEST_FILE, 'utf8');
  const testStub = createBasicTestStub(TEST_FILE, content);
  if (!testStub.includes('subtract')) throw new Error("Test stub missing subtract test");
});

runTest("Test auto-creation processor executes without error", async () => {
  const { testAutoCreationProcessor } = await import(PROJECT_ROOT + '/dist/processors/test-auto-creation-processor.js');
  const result = await testAutoCreationProcessor.execute({
    filePath: TEST_FILE,
    operation: 'create'
  });
  if (!result) throw new Error("Processor returned null");
});

console.log("\n=====================================");
console.log("📊 TEST SUMMARY");
console.log("=====================================");
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

cleanup();
process.exit(failed > 0 ? 1 : 0);
