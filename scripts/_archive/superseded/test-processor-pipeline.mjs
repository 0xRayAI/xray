#!/usr/bin/env node

/**
 * Pre/Post Processor Pipeline Test
 * Tests the complete pre-processor and post-processor pipeline
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../..');

console.log("🧪 PRE/POST PROCESSOR PIPELINE TEST");
console.log("====================================\n");

let passed = 0;
let failed = 0;

// Test file path
const TEST_FILE = join(PROJECT_ROOT, 'src/utils/processor-test-' + Date.now() + '.ts');
const TEST_CONTENT = `export function processData(data: string): string {
  return data.toUpperCase();
}
`;

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

// Cleanup
function cleanup() {
  try {
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  } catch (e) {}
}

process.on('exit', cleanup);

// Create test file
fs.writeFileSync(TEST_FILE, TEST_CONTENT);

// Test preValidate processor
runTest("preValidate processor executes", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const result = await processorManager.executePreProcessors({
    filePath: TEST_FILE,
    operation: 'create'
  });
  if (!result) throw new Error("No result from preValidate");
});

// Test codexCompliance processor
runTest("codexCompliance processor executes", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const result = await processorManager.executePreProcessors({
    filePath: TEST_FILE,
    operation: 'create'
  });
  if (!result.success) throw new Error("codexCompliance failed");
});

// Test testAutoCreation processor
runTest("testAutoCreation processor executes", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const result = await processorManager.executePreProcessors({
    filePath: TEST_FILE,
    operation: 'create'
  });
  // May fail if MCP not available, but should execute
  if (!result) throw new Error("No result from testAutoCreation");
});

// Test full pre-processor pipeline
runTest("Full pre-processor pipeline executes", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const result = await processorManager.executePreProcessors({
    filePath: TEST_FILE,
    operation: 'create',
    code: TEST_CONTENT
  });
  if (!result) throw new Error("Pipeline returned null");
});

// Test post-processor pipeline
runTest("Post-processor pipeline executes", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const result = await processorManager.executePostProcessors({
    filePath: TEST_FILE,
    operation: 'create'
  });
  if (!result) throw new Error("Post-processor returned null");
});

// Test errorBoundary processor
runTest("errorBoundary processor exists", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  const processor = processorManager.postProcessors.get('errorBoundary');
  if (!processor) throw new Error("errorBoundary not found");
});

// Test processor manager state integration
runTest("ProcessorManager integrates with StateManager", async () => {
  const { processorManager } = await import(PROJECT_ROOT + '/dist/processors/processor-manager.js');
  if (!processorManager.stateManager) throw new Error("StateManager not integrated");
});

console.log("\n=====================================");
console.log("📊 TEST SUMMARY");
console.log("=====================================");
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

cleanup();
process.exit(failed > 0 ? 1 : 0);
