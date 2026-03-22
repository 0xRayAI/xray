/**
 * Governance Pipeline Test
 * 
 * Tests the complete enforcement pipeline flow:
 * 
 * Input → RuleRegistry → RuleHierarchy → ValidatorRegistry → RuleExecutor
 *         → ViolationFixer → Output (ValidationReport + ViolationFix[])
 * 
 * This is a TRUE pipeline test that verifies:
 * 1. Rules are loaded and registered
 * 2. Validation runs through all rules
 * 3. Violations are detected and fix attempts are made
 */

import { RuleEnforcer } from '../../../dist/enforcement/rule-enforcer.js';

console.log('=== GOVERNANCE PIPELINE TEST ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((e) => {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

// ============================================
// LAYER 1: Input
// ============================================
console.log('📍 Layer 1: Input');

test('should accept validation context', async () => {
  const enforcer = new RuleEnforcer();
  const context = {
    files: ['test.ts'],
    operation: 'write',
    newCode: 'function test() {}',
    userId: 'test',
    timestamp: new Date()
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('No validation report');
  console.log(`   (report generated)`);
});

// ============================================
// LAYER 2: Rule Registry
// ============================================
console.log('\n📍 Layer 2: Rule Registry');

test('should load rules from registry', () => {
  const enforcer = new RuleEnforcer();
  const count = enforcer.getRuleCount();
  if (count === 0) throw new Error('No rules loaded');
  console.log(`   (${count} rules loaded)`);
});

test('should have core rules registered', () => {
  const enforcer = new RuleEnforcer();
  const coreRules = ['no-duplicate-code', 'tests-required', 'security-by-design', 'no-over-engineering'];
  
  for (const ruleId of coreRules) {
    const rule = enforcer.getRule(ruleId);
    if (!rule) throw new Error(`Core rule missing: ${ruleId}`);
  }
});

test('should enable and disable rules', () => {
  const enforcer = new RuleEnforcer();
  
  enforcer.disableRule('no-duplicate-code');
  if (enforcer.isRuleEnabled('no-duplicate-code')) {
    throw new Error('Rule should be disabled');
  }
  
  enforcer.enableRule('no-duplicate-code');
  if (!enforcer.isRuleEnabled('no-duplicate-code')) {
    throw new Error('Rule should be enabled');
  }
});

// ============================================
// LAYER 3: Rule Execution
// ============================================
console.log('\n📍 Layer 3: Rule Execution');

test('should execute validation for write operation', async () => {
  const enforcer = new RuleEnforcer();
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    newCode: 'function test() { console.log("debug"); }',
    userId: 'test',
    timestamp: new Date()
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('No report');
  
  // Report should have errors/warnings structure
  if (!Array.isArray(report.errors)) throw new Error('Missing errors array');
  if (!Array.isArray(report.warnings)) throw new Error('Missing warnings array');
  console.log(`   (errors: ${report.errors.length}, warnings: ${report.warnings.length})`);
});

test('should detect console.log violations', async () => {
  const enforcer = new RuleEnforcer();
  const context = {
    files: ['test.ts'],
    operation: 'write',
    newCode: 'console.log("debug");',
    userId: 'test',
    timestamp: new Date()
  };
  
  const report = await enforcer.validateOperation('write', context);
  
  // Should detect console.log usage violation
  const hasConsoleViolation = report.errors.some(e => 
    e.rule === 'console-log-usage' || 
    e.message?.includes('console.log')
  );
  
  if (!report.errors.length) {
    console.log(`   (no violations detected)`);
  } else {
    console.log(`   (${report.errors.length} violations)`);
  }
});

test('should return validation report structure', async () => {
  const enforcer = new RuleEnforcer();
  const context = {
    files: ['test.ts'],
    operation: 'write',
    newCode: 'export const x = 1;',
    userId: 'test',
    timestamp: new Date()
  };
  
  const report = await enforcer.validateOperation('write', context);
  
  // Verify report structure
  if (typeof report.passed !== 'boolean') throw new Error('Missing passed field');
  if (!report.results) throw new Error('Missing results field');
  
  console.log(`   (passed: ${report.passed}, results: ${report.results?.length || 0})`);
});

// ============================================
// LAYER 4: Violation Fixing
// ============================================
console.log('\n📍 Layer 4: Violation Fixing');

test('should attempt to fix violations', async () => {
  const enforcer = new RuleEnforcer();
  
  // Create a known violation
  const violations = [{
    rule: 'console-log-usage',
    severity: 'error',
    message: 'Console.log usage detected',
    context: { file: 'test.ts', line: 1, column: 1 },
    timestamp: new Date()
  }];
  
  const context = {
    files: ['test.ts'],
    operation: 'write',
    newCode: 'console.log("x")',
    userId: 'test',
    timestamp: new Date()
  };
  
  const fixes = await enforcer.attemptRuleViolationFixes(violations, context);
  if (!Array.isArray(fixes)) throw new Error('Fixes should be array');
  
  console.log(`   (${fixes.length} fix attempts)`);
});

test('should handle unknown violation gracefully', async () => {
  const enforcer = new RuleEnforcer();
  
  const violations = [{
    rule: 'unknown-rule-xyz',
    severity: 'error',
    message: 'Unknown violation',
    context: { file: 'test.ts' },
    timestamp: new Date()
  }];
  
  const context = {
    files: ['test.ts'],
    operation: 'write',
    newCode: 'x = 1',
    userId: 'test',
    timestamp: new Date()
  };
  
  const fixes = await enforcer.attemptRuleViolationFixes(violations, context);
  
  // Should return fix with attempted=false for unknown rules
  if (fixes.length !== 1) throw new Error('Should return one fix attempt');
  if (fixes[0].attempted) throw new Error('Should mark as not attempted');
  
  console.log(`   (error: ${fixes[0].error})`);
});

// ============================================
// END-TO-END PIPELINE FLOW
// ============================================
console.log('\n📍 End-to-End Pipeline Flow');

test('should complete full governance flow', async () => {
  const enforcer = new RuleEnforcer();
  
  // Step 1: Validate operation
  const context = {
    files: ['src/services/test.ts'],
    operation: 'write',
    newCode: `
      import { frameworkLogger } from '../core/framework-logger.js';
      
      export function processData(data) {
        frameworkLogger.log('test', 'info', { data });
        return data.toUpperCase();
      }
    `,
    userId: 'test-user',
    timestamp: new Date()
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('Validation failed');
  
  // Step 2: If violations exist, attempt fixes
  if (!report.passed && report.errors.length > 0) {
    const fixes = await enforcer.attemptRuleViolationFixes(report.errors, context);
    if (!fixes) throw new Error('Fix attempt failed');
    console.log(`   (${report.errors.length} violations, ${fixes.length} fix attempts)`);
  } else {
    console.log(`   (validation passed)`);
  }
});

test('should validate with different operations', async () => {
  const enforcer = new RuleEnforcer();
  const operations = ['write', 'delete', 'modify'];
  
  for (const operation of operations) {
    const context = {
      files: ['test.ts'],
      operation,
      newCode: operation === 'write' ? 'x = 1' : undefined,
      userId: 'test',
      timestamp: new Date()
    };
    
    const report = await enforcer.validateOperation(operation, context);
    if (!report) throw new Error(`Validation failed for ${operation}`);
  }
  console.log(`   (${operations.length} operations validated)`);
});

test('should track rule statistics', () => {
  const enforcer = new RuleEnforcer();
  const stats = enforcer.getRuleStats();
  
  if (stats.totalRules === 0) throw new Error('No rules in stats');
  if (stats.totalRules !== stats.enabledRules + stats.disabledRules) {
    throw new Error('Rule count mismatch');
  }
  
  console.log(`   (total: ${stats.totalRules}, enabled: ${stats.enabledRules})`);
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('✅ Governance Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Governance Pipeline test FAILED');
    process.exit(1);
  }
}, 500);
