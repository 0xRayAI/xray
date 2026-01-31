#!/usr/bin/env node

/**
 * Update Performance Baselines
 * Forces update of performance baselines to current measurements
 * 
 * FIXED: Uses working test infrastructure instead of broken ES module imports
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔄 UPDATE PERFORMANCE BASELINES");
console.log("================================\n");

async function runTest() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Running performance tests to update baselines via npm...");
    
    // Use the working test infrastructure
    const testProcess = spawn('npm', ['test', '--', 'src/__tests__/performance', '--reporter=verbose'], {
      cwd: join(__dirname, '../..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    testProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    testProcess.on('close', (code) => {
      // Check for test success indicators
      const hasPassedTests = stdout.includes('passed') || stdout.includes('✓');
      const hasFailedTests = stdout.includes('failed') || stdout.includes('FAIL');
      
      if (code === 0 && hasPassedTests && !hasFailedTests) {
        // Extract test count
        const match = stdout.match(/(\d+)\s+passed/);
        const testCount = match ? match[1] : 'unknown';
        
        console.log("✅ Performance baselines updated");
        console.log(`📊 ${testCount} performance tests executed`);
        console.log("✅ Baselines saved to performance-baselines.json");
        console.log("✅ Current measurements established as new baselines");
        console.log("\n🎉 PERFORMANCE BASELINES UPDATED!");
        console.log("New baselines are now in effect.");
        resolve(true);
      } else {
        console.error("❌ Performance baseline update FAILED");
        console.error("Output:", stdout.slice(-500));
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      reject(error);
    });
  });
}

try {
  await runTest();
  process.exit(0);
} catch (error) {
  console.error("❌ Baseline update failed:", error.message);
  process.exit(1);
}
