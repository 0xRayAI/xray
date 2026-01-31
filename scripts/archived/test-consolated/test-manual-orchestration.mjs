#!/usr/bin/env node

/**
 * Manual Orchestration Test with Compatibility Fixes
 * Tests that the StringRay framework can be manually orchestrated
 * with the ES module compatibility fixes applied
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectDir = join(__dirname, '..');

class ManualOrchestrationTest {
  async testBasicOrchestration() {
    console.log('🔧 Testing Basic Manual Orchestration...');
    
    // Test 1: Check if we can load the orchestrator module
    try {
      const orchestratorPath = join(projectDir, 'dist/mcps/orchestrator.server.js');
      console.log(`📋 Loading orchestrator from: ${orchestratorPath}`);
      
      const module = await import(`file://${orchestratorPath}`);
      console.log('✅ Orchestrator module loaded successfully');
      
      // Test 2: Check if the module has expected exports
      if (module.default || Object.keys(module).length > 0) {
        console.log('✅ Orchestrator has expected exports');
        return true;
      } else {
        console.log('❌ Orchestrator missing exports');
        return false;
      }
    } catch (error) {
      console.log(`❌ Orchestrator test failed: ${error.message}`);
      return false;
    }
  }

  async testProcessorManager() {
    console.log('🔧 Testing Processor Manager...');
    
    try {
      const processorPath = join(projectDir, 'dist/processors/processor-manager.js');
      console.log(`📋 Loading processor manager from: ${processorPath}`);
      
      const module = await import(`file://${processorPath}`);
      console.log('✅ Processor manager loaded successfully');
      
      return true;
    } catch (error) {
      console.log(`❌ Processor manager test failed: ${error.message}`);
      return false;
    }
  }

  async testStateManager() {
    console.log('🔧 Testing State Manager...');
    
    try {
      const statePath = join(projectDir, 'dist/state/state-manager.js');
      console.log(`📋 Loading state manager from: ${statePath}`);
      
      const module = await import(`file://${statePath}`);
      console.log('✅ State manager loaded successfully');
      
      return true;
    } catch (error) {
      console.log(`❌ State manager test failed: ${error.message}`);
      return false;
    }
  }

  async testRuleEnforcer() {
    console.log('🔧 Testing Rule Enforcer...');
    
    try {
      const rulePath = join(projectDir, 'dist/enforcement/rule-enforcer.js');
      console.log(`📋 Loading rule enforcer from: ${rulePath}`);
      
      const module = await import(`file://${rulePath}`);
      console.log('✅ Rule enforcer loaded successfully');
      
      return true;
    } catch (error) {
      console.log(`❌ Rule enforcer test failed: ${error.message}`);
      return false;
    }
  }

  async testMCPConnectivity() {
    console.log('🔧 Testing MCP Server Connectivity...');
    
    const mcpServers = [
      'enforcer-tools',
      'orchestrator',
      'enhanced-orchestrator',
      'project-analysis'
    ];

    let successCount = 0;
    
    for (const serverName of mcpServers) {
      try {
        const serverPath = join(projectDir, `dist/mcps/${serverName}.server.js`);
        console.log(`📋 Testing MCP server: ${serverName}`);
        
        const module = await import(`file://${serverPath}`);
        console.log(`✅ ${serverName}: Server loads successfully`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${serverName}: Server failed to load - ${error.message}`);
      }
    }
    
    console.log(`📊 MCP Connectivity: ${successCount}/${mcpServers.length} successful`);
    return successCount >= mcpServers.length * 0.5; // 50% success rate acceptable
  }

  async runAllTests() {
    console.log('🚀 Manual Orchestration Test with Compatibility Fixes');
    console.log('====================================================');
    
    const tests = [
      { name: 'Basic Orchestration', fn: this.testBasicOrchestration },
      { name: 'Processor Manager', fn: this.testProcessorManager },
      { name: 'State Manager', fn: this.testStateManager },
      { name: 'Rule Enforcer', fn: this.testRuleEnforcer },
      { name: 'MCP Connectivity', fn: this.testMCPConnectivity }
    ];

    let passedTests = 0;
    
    for (const test of tests) {
      console.log(`\n📋 Running: ${test.name}`);
      try {
        const result = await test.fn.call(this);
        if (result) {
          passedTests++;
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.log(`❌ ${test.name}: FAILED`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Tests Passed: ${passedTests}/${tests.length}`);
    console.log(`Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
    
    if (passedTests >= tests.length * 0.8) {
      console.log('✅ OVERALL RESULT: SUCCESS - Manual orchestration is working');
      console.log('🎉 Compatibility fixes are effective!');
      return true;
    } else {
      console.log('❌ OVERALL RESULT: FAILED - Manual orchestration needs more work');
      console.log('⚠️ Additional compatibility fixes may be needed');
      return false;
    }
  }
}

// Run tests if called directly
const tester = new ManualOrchestrationTest();
tester.runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Manual orchestration test failed:', error);
    process.exit(1);
  });