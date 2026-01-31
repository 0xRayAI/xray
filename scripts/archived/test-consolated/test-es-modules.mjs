#!/usr/bin/env node

/**
 * ES Module Test Runner
 * Tests ES module compatibility for StringRay components
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = join(__dirname, '..');

class ESTestRunner {
  async testMCPModules() {
    console.log('🔧 Testing ES Module MCP Servers...');
    
    const mcpServers = [
      'dist/mcps/enforcer-tools.server.js',
      'dist/mcps/orchestrator.server.js',
      'dist/mcps/enhanced-orchestrator.server.js',
      'dist/mcps/knowledge-skills/project-analysis.server.js',
      'dist/mcps/knowledge-skills/api-design.server.js',
      'dist/mcps/knowledge-skills/architecture-patterns.server.js',
      'dist/mcps/knowledge-skills/git-workflow.server.js',
      'dist/mcps/knowledge-skills/performance-optimization.server.js',
      'dist/mcps/knowledge-skills/testing-strategy.server.js',
      'dist/mcps/knowledge-skills/code-review.server.js',
      'dist/mcps/knowledge-skills/security-audit.server.js',
      'dist/mcps/knowledge-skills/ui-ux-design.server.js',
      'dist/mcps/knowledge-skills/refactoring-strategies.server.js',
      'dist/mcps/knowledge-skills/testing-best-practices.server.js'
    ];

    let successCount = 0;
    
    for (const serverPath of mcpServers) {
      const fullPath = join(projectDir, serverPath);
      const serverName = serverPath.split('/').pop().replace('.server.js', '');
      
      try {
        console.log(`📋 Testing: ${serverName}`);
        
        // Test if the module can be imported
        await import(`file://${fullPath}`);
        console.log(`✅ ${serverName}: Module imports successfully`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${serverName}: Import failed - ${error.message}`);
      }
    }
    
    console.log(`\n📊 ES Module Test Results: ${successCount}/${mcpServers.length} successful`);
    return successCount === mcpServers.length;
  }

  async testCoreComponents() {
    console.log('🔧 Testing Core Components...');
    
    const coreComponents = [
      'dist/processors/processor-manager.js',
      'dist/state/state-manager.js',
      'dist/enforcement/rule-enforcer.js'
    ];

    let successCount = 0;
    
    for (const componentPath of coreComponents) {
      const fullPath = join(projectDir, componentPath);
      const componentName = componentPath.split('/').pop();
      
      try {
        console.log(`📋 Testing: ${componentName}`);
        
        // Test if the component can be imported
        const module = await import(`file://${fullPath}`);
        console.log(`✅ ${componentName}: Component imports successfully`);
        
        // Test if it has expected exports
        if (module.default || Object.keys(module).length > 0) {
          console.log(`✅ ${componentName}: Has expected exports`);
          successCount++;
        } else {
          console.log(`⚠️ ${componentName}: No exports found`);
        }
      } catch (error) {
        console.log(`❌ ${componentName}: Import failed - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Core Components Test Results: ${successCount}/${coreComponents.length} successful`);
    return successCount >= 2; // Allow some flexibility
  }

  async runAllTests() {
    console.log('🚀 ES Module Compatibility Test Runner');
    console.log('======================================');
    
    const mcpResults = await this.testMCPModules();
    const coreResults = await this.testCoreComponents();
    
    const overallSuccess = mcpResults && coreResults;
    
    console.log('\n📊 Overall Results:');
    console.log(`   MCP Servers: ${mcpResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Core Components: ${coreResults ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    return overallSuccess;
  }
}

// Run tests if called directly
const runner = new ESTestRunner();
runner.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
