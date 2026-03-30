#!/usr/bin/env node
/**
 * Proper Framework Trigger & Monitor
 * 
 * Demonstrates the CORRECT way to trigger framework orchestration:
 * 1. Boot framework (if not already)
 * 2. Create file through framework's processor pipeline
 * 3. Monitor activity logs
 * 4. Generate comprehensive report
 * 
 * @usage node scripts/mjs/trigger-and-monitor-framework.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const LOG_FILE = path.join(PROJECT_ROOT, 'logs', 'framework', 'activity.log');
const TEST_DIR = path.join(PROJECT_ROOT, 'test-framework-trigger');

console.log('🔬 StringRay Framework Trigger & Monitor');
console.log('=' .repeat(70));
console.log('Mode: ACTIVE TRIGGER through framework pipeline');
console.log();

// Report structure
const report = {
  startTime: new Date().toISOString(),
  phases: [],
  processorsTriggered: [],
  testAutoCreated: false,
  duration: 0,
};

function logPhase(phase, status, details = '') {
  const entry = { phase, status, details, time: new Date().toISOString() };
  report.phases.push(entry);
  console.log(`${status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '⏳'} ${phase}: ${details}`);
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Phase 1: Setup
    logPhase('Setup', 'IN_PROGRESS', 'Creating test environment');
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, '.opencode', 'state'), { recursive: true });
    logPhase('Setup', 'SUCCESS', 'Test directory ready');
    
    // Phase 2: Boot Framework
    logPhase('Framework Boot', 'IN_PROGRESS', 'Initializing StringRay framework');
    const { ProcessorManager } = await import('../../dist/processors/processor-manager.js');
    const { StringRayStateManager } = await import('../../dist/state/state-manager.js');
    
    const stateManager = new StringRayStateManager(path.join(TEST_DIR, '.opencode', 'state'));
    global.strRayStateManager = stateManager;
    
    const processorManager = new ProcessorManager(stateManager);
    
    // Register all processors
    processorManager.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
    processorManager.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
    processorManager.registerProcessor({ name: "testAutoCreation", type: "pre", priority: 22, enabled: true });
    processorManager.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
    
    stateManager.set("processor:manager", processorManager);
    logPhase('Framework Boot', 'SUCCESS', 'Framework booted with 4 processors');
    
    // Phase 3: Create Source File
    logPhase('File Creation', 'IN_PROGRESS', 'Creating test source file');
    const sourceFile = path.join(TEST_DIR, 'src', 'payment-gateway.ts');
    const content = `export interface PaymentConfig {
  apiKey: string;
  sandbox: boolean;
}

export function processPayment(amount: number, config: PaymentConfig): Promise<string> {
  return Promise.resolve(\`Processed \${amount} with key \${config.apiKey}\`);
}

export class PaymentProcessor {
  private config: PaymentConfig;
  
  constructor(config: PaymentConfig) {
    this.config = config;
  }
  
  async charge(amount: number): Promise<string> {
    return processPayment(amount, this.config);
  }
}`;
    
    fs.writeFileSync(sourceFile, content, 'utf8');
    logPhase('File Creation', 'SUCCESS', `Created: ${sourceFile}`);
    
    // Phase 4: TRIGGER FRAMEWORK (this is the key!)
    logPhase('Framework Trigger', 'IN_PROGRESS', 'Executing pre-processors through framework');
    
    const initialLogSize = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8').length : 0;
    
    // THIS is how framework gets triggered - through ProcessorManager!
    const result = await processorManager.executePreProcessors({
      tool: "write",
      args: { filePath: "src/payment-gateway.ts" },
      context: {
        directory: TEST_DIR,
        operation: "tool_execution",
        filePath: "src/payment-gateway.ts"
      }
    });
    
    logPhase('Framework Trigger', result.success ? 'SUCCESS' : 'PARTIAL', 
      `Pre-processors: ${result.results.length}, Success: ${result.success}`);
    
    // Track processors
    result.results.forEach(r => {
      report.processorsTriggered.push(r.processorName);
      logPhase(`Processor: ${r.processorName}`, r.success ? 'SUCCESS' : 'FAILED', 
        r.error || 'Executed successfully');
    });
    
    // Phase 5: Check Logs
    logPhase('Log Analysis', 'IN_PROGRESS', 'Checking activity logs');
    await new Promise(r => setTimeout(r, 1000)); // Wait for log flush
    
    if (fs.existsSync(LOG_FILE)) {
      const newLogContent = fs.readFileSync(LOG_FILE, 'utf8').slice(initialLogSize);
      const relevantLogs = newLogContent
        .split('\n')
        .filter(line => line.includes('test-auto-creation') || line.includes('rule-enforcer'));
      
      if (relevantLogs.length > 0) {
        logPhase('Log Analysis', 'SUCCESS', `Found ${relevantLogs.length} relevant log entries`);
        relevantLogs.slice(-3).forEach(line => console.log(`   📝 ${line.slice(0, 100)}...`));
      } else {
        logPhase('Log Analysis', 'WARNING', 'No framework logs found');
      }
    }
    
    // Phase 6: Verify Test Creation
    logPhase('Test Verification', 'IN_PROGRESS', 'Checking for auto-generated test');
    const testFile = path.join(TEST_DIR, 'src', 'payment-gateway.test.ts');
    
    if (fs.existsSync(testFile)) {
      report.testAutoCreated = true;
      const testContent = fs.readFileSync(testFile, 'utf8');
      logPhase('Test Verification', 'SUCCESS', `Test created (${testContent.length} bytes)`);
      console.log('\n   📄 Generated test preview:');
      console.log(testContent.split('\n').slice(0, 10).map(l => '   ' + l).join('\n'));
    } else {
      logPhase('Test Verification', 'FAILED', 'Test not auto-created');
    }
    
    // Phase 7: Execute Post-Processors
    logPhase('Post-Processing', 'IN_PROGRESS', 'Executing post-processors');
    const postResult = await processorManager.executePostProcessors(
      "write",
      { directory: TEST_DIR, operation: "tool_execution", filePath: "src/payment-gateway.ts", success: true },
      []
    );
    logPhase('Post-Processing', postResult.success ? 'SUCCESS' : 'FAILED', 
      `Post-processors completed`);
    
    report.duration = Date.now() - startTime;
    
  } catch (error) {
    logPhase('Execution', 'FAILED', error.message);
    console.error(error.stack);
  }
  
  // Final Report
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE FRAMEWORK REPORT');
  console.log('='.repeat(70));
  console.log(`\n⏱️  Total Duration: ${report.duration}ms\n`);
  
  console.log('📋 Execution Phases:');
  report.phases.forEach(p => {
    const icon = p.status === 'SUCCESS' ? '✅' : p.status === 'FAILED' ? '❌' : '⏳';
    console.log(`   ${icon} ${p.phase}: ${p.details}`);
  });
  
  console.log('\n🔄 Processors Triggered:');
  if (report.processorsTriggered.length > 0) {
    [...new Set(report.processorsTriggered)].forEach(p => console.log(`   ✅ ${p}`));
  } else {
    console.log('   ❌ None');
  }
  
  console.log('\n🧪 Test Auto-Creation:', report.testAutoCreated ? '✅ SUCCESS' : '❌ FAILED');
  
  // Overall status
  const allPassed = report.phases.every(p => p.status === 'SUCCESS') && report.testAutoCreated;
  console.log('\n' + '='.repeat(70));
  console.log(allPassed ? '🎉 FRAMEWORK FULLY OPERATIONAL' : '⚠️  PARTIAL SUCCESS - Review phases above');
  console.log('='.repeat(70));
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
    console.log('✅ Test directory removed');
  }
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'logs', 'framework', `framework-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Report saved: ${reportPath}`);
}

main();
