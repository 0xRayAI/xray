#!/usr/bin/env node
/**
 * Framework Orchestration Monitoring & Reporting
 * 
 * This script:
 * 1. Creates a test file (triggering framework processing)
 * 2. Monitors activity logs in real-time
 * 3. Generates a detailed report of framework behavior
 * 4. Does NOT orchestrate - lets framework work autonomously
 * 
 * @usage node scripts/mjs/monitor-framework-orchestration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const LOG_FILE = path.join(PROJECT_ROOT, 'logs', 'framework', 'activity.log');
const TEST_DIR = path.join(PROJECT_ROOT, 'test-framework-monitor');

console.log('🔬 StringRay Framework Orchestration Monitor');
console.log('=' .repeat(70));
console.log('Mode: PASSIVE OBSERVATION - Framework operates autonomously');
console.log('Goal: Verify pre/post processors execute without direct control');
console.log();

// Report data structure
const report = {
  startTime: new Date().toISOString(),
  testFile: null,
  testContent: null,
  events: [],
  processorsTriggered: [],
  testAutoCreated: false,
  errors: [],
  duration: 0,
};

// Monitor state
let initialLogSize = 0;
let monitoring = true;
let logCheckInterval = null;

/**
 * Monitor activity log for new entries
 */
function startLogMonitoring() {
  console.log('📊 Starting log monitoring...');
  
  if (fs.existsSync(LOG_FILE)) {
    initialLogSize = fs.readFileSync(LOG_FILE, 'utf8').length;
  }
  
  const startTime = Date.now();
  const maxDuration = 30000; // 30 seconds max monitoring
  
  logCheckInterval = setInterval(() => {
    if (!monitoring) return;
    
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      console.log('⏱️  Monitoring timeout reached');
      stopMonitoring();
      return;
    }
    
    if (fs.existsSync(LOG_FILE)) {
      const currentContent = fs.readFileSync(LOG_FILE, 'utf8');
      const newContent = currentContent.slice(initialLogSize);
      
      if (newContent.trim()) {
        const lines = newContent.trim().split('\n');
        lines.forEach(line => {
          if (line.includes('processor') || 
              line.includes('test-auto-creation') || 
              line.includes('rule-enforcer') ||
              line.includes('orchestrat')) {
            report.events.push({
              timestamp: new Date().toISOString(),
              logEntry: line,
            });
            
            // Extract processor names
            if (line.includes('processor-manager')) {
              if (line.includes('pre-processor')) {
                report.processorsTriggered.push('pre-processor (generic)');
              }
              if (line.includes('test-auto-creation')) {
                report.processorsTriggered.push('testAutoCreation');
              }
            }
            
            if (line.includes('test-auto-creation') && line.includes('generating-tests')) {
              report.processorsTriggered.push('testAutoCreation-generating');
            }
            
            if (line.includes('rule-enforcer')) {
              report.processorsTriggered.push('ruleEnforcer');
            }
          }
        });
        
        initialLogSize = currentContent.length;
      }
    }
  }, 500); // Check every 500ms
}

function stopMonitoring() {
  monitoring = false;
  if (logCheckInterval) {
    clearInterval(logCheckInterval);
    logCheckInterval = null;
  }
}

/**
 * Create test file (this triggers framework processing)
 */
async function createTestFile() {
  console.log('📝 Creating test source file...');
  console.log('   (This should trigger framework pre-processors)');
  
  // Setup test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
  
  // Create source file
  const testFile = path.join(TEST_DIR, 'src', 'new-feature.ts');
  const content = `/**
 * New Feature Module - Auto-generated for framework testing
 * @testFrameworkMonitor
 */

export interface FeatureConfig {
  name: string;
  enabled: boolean;
  priority: number;
}

export function initializeFeature(config: FeatureConfig): string {
  if (!config.enabled) {
    return "Feature " + config.name + " is disabled";
  }
  return "Feature " + config.name + " initialized with priority " + config.priority;
}

export function validateConfig(config: Partial<FeatureConfig>): boolean {
  return !!(config.name && typeof config.enabled === 'boolean');
}

export class FeatureManager {
  private features: FeatureConfig[] = [];
  
  addFeature(config: FeatureConfig): void {
    if (validateConfig(config)) {
      this.features.push(config);
    }
  }
  
  getEnabledFeatures(): FeatureConfig[] {
    return this.features.filter(f => f.enabled);
  }
  
  getFeatureCount(): number {
    return this.features.length;
  }
}

export const DEFAULT_CONFIG: FeatureConfig = {
  name: 'default',
  enabled: true,
  priority: 1,
};
`;

  report.testFile = testFile;
  report.testContent = content;
  
  // Write file (this simulates a tool write operation)
  fs.writeFileSync(testFile, content, 'utf8');
  
  console.log(`✅ Test file created: ${testFile}`);
  console.log('   Exports: FeatureConfig interface, initializeFeature(), validateConfig(), FeatureManager class, DEFAULT_CONFIG');
  console.log();
  
  return testFile;
}

/**
 * Wait for framework processing
 */
async function waitForProcessing() {
  console.log('⏳ Waiting for framework to process...');
  console.log('   (Monitoring for 10 seconds...)');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  stopMonitoring();
  
  console.log('✅ Monitoring complete');
  console.log();
}

/**
 * Check if test was auto-created
 */
function checkTestCreation() {
  console.log('🔍 Checking for auto-generated test...');
  
  const expectedTestFile = path.join(TEST_DIR, 'src', 'new-feature.test.ts');
  
  if (fs.existsSync(expectedTestFile)) {
    report.testAutoCreated = true;
    console.log(`✅ Test file auto-created: ${expectedTestFile}`);
    
    const testContent = fs.readFileSync(expectedTestFile, 'utf8');
    console.log('   Test file size:', testContent.length, 'bytes');
    console.log('   Test file preview:');
    console.log('   ' + testContent.split('\n').slice(0, 8).join('\n   '));
  } else {
    report.testAutoCreated = false;
    console.log(`❌ Test file NOT created: ${expectedTestFile}`);
    console.log('   (This may be expected if MCP skills unavailable)');
  }
  
  console.log();
}

/**
 * Generate detailed report
 */
function generateReport() {
  report.duration = Date.now() - new Date(report.startTime).getTime();
  
  console.log('=' .repeat(70));
  console.log('📋 FRAMEWORK ORCHESTRATION REPORT');
  console.log('=' .repeat(70));
  console.log();
  
  console.log('⏱️  Test Duration:', report.duration, 'ms');
  console.log();
  
  console.log('📁 Test File Created:');
  console.log(`   Path: ${report.testFile}`);
  console.log(`   Size: ${report.testContent?.length || 0} bytes`);
  console.log();
  
  console.log('🔄 Processors Triggered:');
  if (report.processorsTriggered.length > 0) {
    const uniqueProcessors = [...new Set(report.processorsTriggered)];
    uniqueProcessors.forEach(proc => {
      console.log(`   ✅ ${proc}`);
    });
  } else {
    console.log('   ⚠️  No processors detected in logs');
    console.log('      (Framework may not be active or logging disabled)');
  }
  console.log();
  
  console.log('🧪 Test Auto-Creation:');
  console.log(`   ${report.testAutoCreated ? '✅ SUCCESS' : '❌ NOT CREATED'}`);
  console.log();
  
  console.log('📊 Events Captured:', report.events.length);
  if (report.events.length > 0) {
    console.log('   Recent events:');
    report.events.slice(-5).forEach((event, i) => {
      const shortEntry = event.logEntry.slice(0, 100);
      console.log(`   ${i + 1}. ${shortEntry}...`);
    });
  }
  console.log();
  
  // Summary
  console.log('=' .repeat(70));
  console.log('🎯 SUMMARY');
  console.log('=' .repeat(70));
  
  const checks = {
    'Framework Active': report.events.length > 0,
    'Pre-processors Executed': report.processorsTriggered.some(p => p.includes('pre')),
    'Rule Enforcer Active': report.processorsTriggered.includes('ruleEnforcer'),
    'Test Auto-Creation Triggered': report.processorsTriggered.includes('testAutoCreation-generating') || report.processorsTriggered.includes('testAutoCreation'),
    'Test File Generated': report.testAutoCreated,
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  });
  
  const passRate = Object.values(checks).filter(v => v).length / Object.values(checks).length;
  console.log();
  console.log(`📈 Pass Rate: ${Math.round(passRate * 100)}%`);
  console.log();
  
  if (passRate === 1) {
    console.log('🎉 PERFECT: Framework orchestration working flawlessly!');
  } else if (passRate >= 0.6) {
    console.log('✅ GOOD: Framework mostly working, some components may need attention');
  } else {
    console.log('⚠️  ISSUES: Framework not fully operational, review logs above');
  }
  
  console.log();
  
  // Cleanup
  console.log('🧹 Cleaning up test directory...');
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
    console.log('✅ Test directory removed');
  }
  
  // Write report to file
  const reportPath = path.join(PROJECT_ROOT, 'logs', 'framework', `orchestration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📝 Report saved: ${reportPath}`);
  
  return passRate === 1 ? 0 : (passRate >= 0.6 ? 0 : 1);
}

// Main execution
async function main() {
  try {
    // Phase 1: Start monitoring
    startLogMonitoring();
    
    // Phase 2: Create file (triggers framework)
    await createTestFile();
    
    // Phase 3: Wait for processing
    await waitForProcessing();
    
    // Phase 4: Check results
    checkTestCreation();
    
    // Phase 5: Generate report
    const exitCode = generateReport();
    
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Error:', error);
    stopMonitoring();
    process.exit(1);
  }
}

main();
