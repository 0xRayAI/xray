#!/usr/bin/env node

/**
 * Master Test Runner
 * 
 * Executes all test scripts in the correct order and provides
 * a comprehensive summary of all test results.
 * 
 * Usage:
 *   node scripts/mjs/run-all-tests.mjs
 *   node scripts/mjs/run-all-tests.mjs --quick    # Skip slow tests
 *   node scripts/mjs/run-all-tests.mjs --coverage # Generate coverage
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Parse command line arguments
const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const coverageMode = args.includes('--coverage');

// Test suite definitions
const TEST_SUITES = [
  {
    name: 'MCP Registration Validation',
    script: 'test-mcp-registration.mjs',
    description: 'Validates all agents in features.json have MCP configs',
    required: true
  },
  {
    name: 'Skill Routing Tests',
    script: 'test-skill-routing.mjs',
    description: 'Tests TaskSkillRouter with various prompts',
    required: true
  },
  {
    name: 'MCP Server Tests',
    script: 'test-mcp-servers.mjs',
    description: 'Tests all MCP server registrations',
    required: true
  },
  {
    name: 'Agent Tests',
    script: 'test-agents.mjs',
    description: 'Tests all 22 agent registrations',
    required: true
  },
  {
    name: 'Skills Coverage Tests',
    script: 'test-skills-coverage.mjs',
    description: 'Tests all skill mappings and keywords',
    required: true
  },
  {
    name: 'Framework Integration Tests',
    script: 'test-framework-integration.mjs',
    description: 'Tests core framework functionality',
    required: true
  },
  {
    name: 'Processor Pipeline Tests',
    script: 'test-processor-pipeline.mjs',
    description: 'Tests processor pipeline functionality',
    required: !quickMode
  },
  {
    name: 'Auto Creation Flow Tests',
    script: 'test-auto-creation-flow.mjs',
    description: 'Tests automatic test generation',
    required: !quickMode
  },
  {
    name: 'Enforcer Comprehensive Tests',
    script: 'test-enforcer-comprehensive.mjs',
    description: 'Tests rule enforcement system',
    required: !quickMode
  }
];

// Results tracking
const results = {
  suites: [],
  totalPassed: 0,
  totalFailed: 0,
  startTime: Date.now()
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    error: '\x1b[31m',   // red
    warn: '\x1b[33m',    // yellow
    section: '\x1b[35m', // magenta
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    section: '🎯'
  }[type] || 'ℹ️';
  
  const color = colors[type] || colors.info;
  console.log(`${color}${prefix} ${message}${colors.reset}`);
}

function logHeader(text) {
  console.log('\n' + '='.repeat(70));
  log(text, 'section');
  console.log('='.repeat(70));
}

function logSubHeader(text) {
  console.log('\n' + '-'.repeat(50));
  log(text, 'info');
  console.log('-'.repeat(50));
}

// Run a single test script
function runScript(scriptPath) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const child = spawn('node', [scriptPath], {
      cwd: rootDir,
      stdio: 'pipe',
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        code,
        stdout,
        stderr,
        duration,
        success: code === 0
      });
    });
    
    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error.message,
        duration: Date.now() - startTime,
        success: false
      });
    });
  });
}

// Run a test suite
async function runTestSuite(suite) {
  const scriptPath = path.join(__dirname, suite.script);
  
  // Check if script exists
  if (!fs.existsSync(scriptPath)) {
    return {
      suite: suite.name,
      success: false,
      error: `Script not found: ${suite.script}`,
      duration: 0,
      tests: 0
    };
  }
  
  log(`Running: ${suite.description}`);
  
  const result = await runScript(scriptPath);
  
  // Parse test results from output
  let tests = 0;
  let passed = 0;
  let failed = 0;
  
  const lines = result.stdout.split('\n');
  for (const line of lines) {
    if (line.includes('Total tests:')) {
      const match = line.match(/Total tests: (\d+)/);
      if (match) tests = parseInt(match[1]);
    }
    if (line.includes('Passed:')) {
      const match = line.match(/Passed: (\d+)/);
      if (match) passed = parseInt(match[1]);
    }
    if (line.includes('Failed:')) {
      const match = line.match(/Failed: (\d+)/);
      if (match) failed = parseInt(match[1]);
    }
  }
  
  return {
    suite: suite.name,
    script: suite.script,
    success: result.success,
    passed,
    failed,
    tests,
    duration: result.duration,
    error: result.stderr || null
  };
}

// Run all test suites
async function runAllTests() {
  logHeader('MASTER TEST RUNNER');
  
  console.log(`\nMode: ${quickMode ? 'Quick' : 'Full'}`);
  console.log(`Test Suites: ${TEST_SUITES.length}`);
  console.log(`Started at: ${new Date().toLocaleString()}\n`);
  
  for (const suite of TEST_SUITES) {
    if (!suite.required && quickMode) {
      log(`Skipping (quick mode): ${suite.name}`, 'warn');
      continue;
    }
    
    logSubHeader(suite.name);
    
    const result = await runTestSuite(suite);
    results.suites.push(result);
    
    if (result.success) {
      results.totalPassed += result.passed;
      log(`✓ Passed (${result.duration}ms)`, 'success');
    } else {
      results.totalFailed += result.failed;
      log(`✗ Failed (${result.duration}ms)`, 'error');
      if (result.error) {
        console.log(`  Error: ${result.error.substring(0, 200)}`);
      }
    }
  }
  
  // Run npm test if not in quick mode
  if (!quickMode) {
    logSubHeader('Running npm test suite');
    const npmResult = await runScript('node_modules/.bin/vitest run');
    results.npmTest = {
      success: npmResult.success,
      duration: npmResult.duration,
      output: npmResult.stdout.substring(0, 500)
    };
  }
}

// Print final summary
function printSummary() {
  const totalDuration = Date.now() - results.startTime;
  
  console.log('\n' + '='.repeat(70));
  log('FINAL TEST SUMMARY', 'section');
  console.log('='.repeat(70));
  
  console.log('\n📊 Test Suite Results:');
  console.log('-'.repeat(50));
  
  for (const suite of results.suites) {
    const status = suite.success ? '✅' : '❌';
    const tests = suite.tests > 0 ? `(${suite.passed}/${suite.tests})` : '';
    console.log(`${status} ${suite.suite} ${tests} - ${suite.duration}ms`);
  }
  
  console.log('\n📈 Summary:');
  console.log('-'.repeat(50));
  console.log(`Total Suites: ${results.suites.length}`);
  console.log(`Total Passed: ${results.totalPassed}`);
  console.log(`Total Failed: ${results.totalFailed}`);
  console.log(`Success Rate: ${((results.totalPassed / (results.totalPassed + results.totalFailed || 1)) * 100).toFixed(1)}%`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (results.npmTest) {
    console.log('\n🧪 NPM Test Suite:');
    console.log('-'.repeat(50));
    console.log(`Status: ${results.npmTest.success ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Duration: ${results.npmTest.duration}ms`);
  }
  
  console.log('\n' + '='.repeat(70));
  
  const allPassed = results.suites.every(s => s.success) && (!results.npmTest || results.npmTest.success);
  
  if (allPassed) {
    log('ALL TESTS PASSED 🎉', 'success');
  } else {
    log('SOME TESTS FAILED ❌', 'error');
    console.log('\nFailed suites:');
    for (const suite of results.suites.filter(s => !s.success)) {
      console.log(`  - ${suite.suite}: ${suite.error || 'Unknown error'}`);
    }
  }
  
  console.log('='.repeat(70) + '\n');
  
  return allPassed;
}

// Main execution
async function main() {
  try {
    await runAllTests();
    const success = printSummary();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  }
}

main();
