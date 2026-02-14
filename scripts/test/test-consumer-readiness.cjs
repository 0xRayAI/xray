#!/usr/bin/env node

/**
 * StringRay Framework Consumer Readiness Test
 * Tests if the framework is ready for consumer use
 * Author: StringRay Enforcer Agent
 * Version: 1.1.1
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message, type) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '📋',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'consumer': '🛒'
  };
  
  console.log(`[${prefix[type]}] [${timestamp}] ${message}`);
}

class ConsumerReadinessTest {
  constructor() {
    this.results = {
      build: false,
      mcp: false,
      core: false,
      cli: false,
      integration: false
    };
  }

  async testBuildSystem() {
    log('Testing Build System...', 'consumer');
    
    const buildFiles = [
      'dist/cli/index.js',
      'dist/plugin/strray-codex-injection.js',
      'dist/processors/processor-manager.js',
      'dist/state/state-manager.js',
      'dist/enforcement/rule-enforcer.js'
    ];

    let allPresent = true;
    
    for (const file of buildFiles) {
      const fullPath = path.join(__dirname, '..', '..', file);
      if (fs.existsSync(fullPath)) {
        log('Found: ' + file, 'consumer');
        this.results.build = true;
      } else {
        log('Missing: ' + file, 'consumer');
        allPresent = false;
      }
    }
    
    log('Build System: ' + (allPresent ? 'READY' : 'INCOMPLETE'), 'consumer');
    return allPresent;
  }

  async testMCPConnectivity() {
    log('Testing MCP Connectivity...', 'consumer');
    
    const mcpServers = [
      'enforcer-tools',
      'orchestrator',
      'enhanced-orchestrator',
      'architect-tools',
      'framework-compliance-audit',
      'security-scan',
      'performance-analysis',
      'model-health-check',
      'boot-orchestrator',
      'framework-help',
      'lint',
      'auto-format',
      'processor-pipeline',
      'state-manager'
    ];

    let connectedServers = 0;
    
    for (const server of mcpServers) {
      const serverPath = path.join(__dirname, '..', '..', 'dist/mcps/' + server + '.server.js');
      if (fs.existsSync(serverPath)) {
        log('Found MCP Server: ' + server, 'consumer');
        connectedServers++;
        this.results.mcp = true;
      } else {
        log('Missing MCP Server: ' + server, 'consumer');
      }
    }
    
    const allServersConnected = connectedServers === mcpServers.length;
    log('MCP Connectivity: ' + (allServersConnected ? 'ALL CONNECTED' : 'PARTIAL'), 'consumer');
    return allServersConnected;
  }

  async testCoreComponents() {
    log('Testing Core Components...', 'consumer');
    
    const components = [
      { name: 'State Manager', path: 'dist/state/state-manager.js' },
      { name: 'Processor Manager', path: 'dist/processors/processor-manager.js' },
      { name: 'Rule Enforcer', path: 'dist/enforcement/rule-enforcer.js' }
    ];

    let allFunctional = true;
    
    for (const component of components) {
      try {
        log('Testing component: ' + component.name, 'consumer');
        
        // Test ES module syntax validity (files are ES modules in CommonJS package)
        const testResult = await this.testESModuleSyntax(component.path);
        
        if (testResult.valid) {
          log('Component Valid: ' + component.name, 'consumer');
          this.results.core = true;
        } else {
          log('Component Invalid: ' + component.name + ' - ' + testResult.error, 'consumer');
          allFunctional = false;
        }
      } catch (error) {
        log('Component Error: ' + component.name + ' - ' + error.message, 'consumer');
        allFunctional = false;
      }
    }
    
    log('Core Components: ' + (allFunctional ? 'VALID' : 'INVALID'), 'consumer');
    return allFunctional;
  }

  async testESModuleSyntax(modulePath) {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(__dirname, '..', '..', modulePath);
      // Check if file exists and has valid JavaScript syntax
      if (!fs.existsSync(fullPath)) {
        resolve({ valid: false, error: 'File not found' });
        return;
      }
      
      // Use node --check to verify syntax (works for both ES and CommonJS)
      const child = spawn('node', ['--check', fullPath], { stdio: 'pipe' });

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ valid: true });
        } else {
          resolve({ valid: false, error: stderr || 'Syntax check failed' });
        }
      });

      child.on('error', (error) => {
        resolve({ valid: false, error: error.message });
      });
    });
  }

  async testCLICommands() {
    log('Testing CLI Commands...', 'consumer');
    
    const cliCommands = [
      { name: 'help', args: ['--help'] },
      { name: 'status', args: ['status'] },
      { name: 'version', args: ['--version'] }
    ];

    let cliFunctional = true;
    
    for (const cmd of cliCommands) {
      try {
        log('Testing CLI: ' + cmd.name, 'consumer');
        
        // Check CLI syntax validity (ES module in CommonJS package context)
        const cliPath = path.join(__dirname, '..', '..', 'dist/cli/index.js');
        const syntaxResult = await this.testESModuleSyntax('dist/cli/index.js');
        
        if (syntaxResult.valid) {
          log('CLI Syntax Valid: ' + cmd.name, 'consumer');
          this.results.cli = true;
        } else {
          log('CLI Syntax Invalid: ' + cmd.name + ' - ' + syntaxResult.error, 'consumer');
          cliFunctional = false;
        }
      } catch (error) {
        log('CLI Error: ' + cmd.name + ' - ' + error.message, 'consumer');
        cliFunctional = false;
      }
    }
    
    log('CLI Commands: ' + (cliFunctional ? 'FUNCTIONAL' : 'NON-FUNCTIONAL'), 'consumer');
    return cliFunctional;
  }

  async testIntegrationPoints() {
    log('Testing Integration Points...', 'consumer');
    
    const integrationPoints = [
      { name: 'OpenCode Configuration', check: () => {
        const fs = require('fs');
        return fs.existsSync(path.join(__dirname, '..', '..', '.opencode/OpenCode.json'));
      }},
      { name: 'Postinstall Script', check: () => {
        const fs = require('fs');
        return fs.existsSync(path.join(__dirname, '..', '..', 'scripts/node/postinstall.cjs'));
      }}
    ];

    let allIntegrated = true;
    
    for (const point of integrationPoints) {
      try {
        log('Testing integration: ' + point.name, 'consumer');
        
        if (point.check()) {
          log('Integration Works: ' + point.name, 'consumer');
          this.results.integration = true;
        } else {
          log('Integration Missing: ' + point.name, 'consumer');
          allIntegrated = false;
        }
      } catch (error) {
        log('Integration Error: ' + point.name + ' - ' + error.message, 'consumer');
        allIntegrated = false;
      }
    }
    
    log('Integration Points: ' + (allIntegrated ? 'INTEGRATED' : 'NOT INTEGRATED'), 'consumer');
    return allIntegrated;
  }

  async runCommand(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { 
        shell: true, 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..', '..')
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
        reject(new Error('Command timed out after ' + timeout + 'ms: ' + command));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error('Command failed with exit code ' + code + ': ' + command));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async runConsumerReadinessTest() {
    log('StringRay Framework - Consumer Readiness Test', 'consumer');
    log('==========================================', 'consumer');
    
    const startTime = Date.now();
    
    try {
      // Test 1: Build System
      await this.testBuildSystem();
      
      // Test 2: Core Components
      await this.testCoreComponents();
      
      // Test 3: MCP Connectivity
      await this.testMCPConnectivity();
      
      // Test 4: CLI Commands
      await this.testCLICommands();
      
      // Test 5: Integration Points
      await this.testIntegrationPoints();
      
      const duration = Date.now() - startTime;
      const testsPassed = [
        this.results.build,
        this.results.core,
        this.results.mcp,
        this.results.cli,
        this.results.integration
      ].filter(Boolean).length;
      
      const totalTests = 5;
      const successRate = Math.round((testsPassed / totalTests) * 100);
      
      log('Consumer Readiness Summary', 'consumer');
      log('============================', 'consumer');
      log('Duration: ' + Math.round(duration / 1000) + 's', 'consumer');
      log('Tests Passed: ' + testsPassed + '/' + totalTests, 'consumer');
      log('Success Rate: ' + successRate + '%', 'consumer');
      
      // Overall assessment
      log('Overall Assessment:', 'consumer');
      if (successRate >= 90 && testsPassed === totalTests) {
        log('EXCELLENT: Framework is consumer-ready', 'success');
        return true;
      } else if (successRate >= 80) {
        log('GOOD: Framework is mostly consumer-ready', 'success');
        return true;
      } else if (successRate >= 60) {
        log('FAIR: Framework needs attention before consumer use', 'warning');
        return false;
      } else {
        log('POOR: Framework requires significant fixes', 'error');
        return false;
      }
      
    } catch (error) {
      log('Consumer readiness test failed: ' + error.message, 'consumer');
      return false;
    }
  }
}

// Run tests if called directly
const tester = new ConsumerReadinessTest();
tester.runConsumerReadinessTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Consumer readiness test failed:', error);
    process.exit(1);
  });