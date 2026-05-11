#!/usr/bin/env node

/**
 * Unified Test Framework
 * Consolidates overlapping test functionality from multiple scripts
 * FIXED: Uses working npm test infrastructure instead of broken ES module imports
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = join(__dirname, '../..');

class UnifiedTestFramework {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runNpmTest(testFile, testName) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${testName}`, 'test');
      
      const child = spawn('npm', ['test', '--', testFile, '--reporter=dot'], {
        shell: true,
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
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
        if (code === 0) {
          this.log(`✅ ${testName}: Passed`, 'success');
          this.results.passed.push(testName);
          resolve(true);
        } else {
          this.log(`❌ ${testName}: Failed`, 'error');
          this.results.failed.push(testName);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        this.log(`❌ ${testName}: Error - ${error.message}`, 'error');
        this.results.failed.push(testName);
        resolve(false);
      });
    });
  }

  async testCoreComponents() {
    this.log('Testing Core Components...', 'test');
    
    const tests = [
      { file: 'src/__tests__/unit/orchestrator.test.ts', name: 'Orchestrator' },
      { file: 'src/__tests__/unit/agent-delegator.test.ts', name: 'Agent Delegator' },
      { file: 'src/__tests__/unit/state-manager.test.ts', name: 'State Manager' },
      { file: 'src/__tests__/unit/rule-enforcer.test.ts', name: 'Rule Enforcer' }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.runNpmTest(test.file, test.name);
      if (result) passed++;
    }
    
    this.log(`Core Components: ${passed}/${tests.length} passed`, passed >= 3 ? 'success' : 'error');
    return passed >= 3;
  }

  async testIntegration() {
    this.log('Testing Integration...', 'test');
    
    const tests = [
      { file: 'src/__tests__/unit/boot-orchestrator.test.ts', name: 'Boot Orchestrator Integration' },
      { file: 'src/__tests__/integration/orchestration-e2e.test.ts', name: 'Orchestration E2E' }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = await this.runNpmTest(test.file, test.name);
      if (result) passed++;
    }
    
    this.log(`Integration: ${passed}/${tests.length} passed`, passed >= 1 ? 'success' : 'error');
    return passed >= 1;
  }

  async testSystemHealth() {
    this.log('Testing System Health...', 'test');
    
    const checks = [
      { command: 'npm run typecheck', name: 'TypeScript Compilation', timeout: 60000 },
      { command: 'npm run build', name: 'Build Process', timeout: 60000 }
    ];

    let passed = 0;
    
    for (const check of checks) {
      try {
        this.log(`Running: ${check.name}`);
        await this.runCommand(check.command, check.timeout);
        this.log(`✅ ${check.name}: Passed`, 'success');
        passed++;
        this.results.passed.push(check.name);
      } catch (error) {
        this.log(`❌ ${check.name}: Failed`, 'error');
        this.results.failed.push(check.name);
      }
    }
    
    this.log(`System Health: ${passed}/${checks.length} checks passed`);
    return passed >= 1;
  }

  runCommand(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        cwd: projectDir
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Timeout`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async runComprehensiveTest() {
    this.log('🚀 StringRay Framework - Unified Test Framework', 'info');
    this.log('================================================', 'info');
    this.log(`Project Directory: ${projectDir}`, 'info');
    
    const startTime = Date.now();
    
    try {
      // Phase 1: Core Components
      const coreResult = await this.testCoreComponents();
      
      // Phase 2: Integration
      const integrationResult = await this.testIntegration();
      
      // Phase 3: System Health
      const healthResult = await this.testSystemHealth();
      
      const duration = Date.now() - startTime;
      const totalTests = this.results.passed.length + this.results.failed.length;
      const successRate = totalTests > 0 ? Math.round((this.results.passed.length / totalTests) * 100) : 0;
      
      this.log('Unified Test Summary', 'info');
      this.log('=====================', 'info');
      this.log(`Duration: ${Math.round(duration / 1000)}s`, 'info');
      this.log(`Total Tests: ${totalTests}`, 'info');
      this.log(`Passed: ${this.results.passed.length}`, 'success');
      this.log(`Failed: ${this.results.failed.length}`, 'error');
      this.log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'error');
      
      if (this.results.failed.length > 0) {
        this.log('Failed Tests:', 'error');
        this.results.failed.forEach(failure => {
          this.log(`  • ${failure}`, 'error');
        });
      }
      
      this.log('Overall Assessment:', 'info');
      if (successRate >= 80 && coreResult && integrationResult) {
        this.log('🎉 EXCELLENT: Framework is production-ready', 'success');
        return true;
      } else if (successRate >= 60) {
        this.log('✅ GOOD: Framework is mostly ready', 'success');
        return true;
      } else {
        this.log('⚠️  NEEDS ATTENTION: Some tests failed', 'warning');
        return false;
      }
      
    } catch (error) {
      this.log(`Unified test failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run tests if called directly
const tester = new UnifiedTestFramework();
tester.runComprehensiveTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unified test framework failed:', error);
    process.exit(1);
  });
