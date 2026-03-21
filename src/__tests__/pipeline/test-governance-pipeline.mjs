/**
 * Governance Pipeline Test
 * 
 * Tests the complete enforcement pipeline:
 * Input → Rule Registry → Validator Registry → Rule Executor → Violation Fixer → Output
 */

import { RuleEnforcer } from './dist/enforcement/rule-enforcer.js';

console.log('=== GOVERNANCE PIPELINE TEST ===\n');

// Track results
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
// LAYER 1: INPUT
// ============================================
console.log('📍 Layer 1: Input');

test('should create RuleEnforcer instance', () => {
  const enforcer = new RuleEnforcer();
  if (!enforcer) throw new Error('Failed to create RuleEnforcer');
});

// ============================================
// LAYER 2: RULE REGISTRY
// ============================================
console.log('\n📍 Layer 2: Rule Registry');

test('should have rules loaded', () => {
  const enforcer = new RuleEnforcer();
  const count = enforcer.getRuleCount();
  if (count === 0) throw new Error('No rules loaded');
  console.log(`   (${count} rules loaded)`);
});

test('should have core rules registered', () => {
  const enforcer = new RuleEnforcer();
  const rules = enforcer.getRules();
  const coreRules = ['no-duplicate-code', 'tests-required', 'security-by-design', 'no-over-engineering'];
  for (const ruleId of coreRules) {
    const rule = enforcer.getRule(ruleId);
    if (!rule) throw new Error(`Core rule missing: ${ruleId}`);
  }
});

test('should enable/disable rules', () => {
  const enforcer = new RuleEnforcer();
  const result = enforcer.disableRule('no-duplicate-code');
  if (!result) throw new Error('Failed to disable rule');
  
  const isEnabled = enforcer.isRuleEnabled('no-duplicate-code');
  if (isEnabled) throw new Error('Rule should be disabled');
  
  enforcer.enableRule('no-duplicate-code');
  const isEnabledAgain = enforcer.isRuleEnabled('no-duplicate-code');
  if (!isEnabledAgain) throw new Error('Rule should be enabled');
});

// ============================================
// LAYER 3: VALIDATOR REGISTRY
// ============================================
console.log('\n📍 Layer 3: Validator Registry');

test('should get rule statistics', () => {
  const enforcer = new RuleEnforcer();
  const stats = enforcer.getRuleStats();
  if (!stats.totalRules) throw new Error('No rules in stats');
  if (stats.totalRules !== stats.enabledRules + stats.disabledRules) {
    throw new Error('Rule count mismatch');
  }
});

// ============================================
// LAYER 4: RULE EXECUTOR
// ============================================
console.log('\n📍 Layer 4: Rule Executor');

test('should validate write operation', async () => {
  const enforcer = new RuleEnforcer();
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    newCode: 'function test() { console.log("test"); }',
    userId: 'test-user',
    timestamp: new Date(),
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('No validation report returned');
  
  console.log(`   (passed: ${report.passed}, errors: ${report.errors.length}, warnings: ${report.warnings.length})`);
});

test('should validate with code content', async () => {
  const enforcer = new RuleEnforcer();
  const codeWithConsoleLog = 'function test() { console.log("debug"); }';
  
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    newCode: codeWithConsoleLog,
    userId: 'test-user',
    timestamp: new Date(),
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('No validation report returned');
  if (typeof report.passed !== 'boolean') throw new Error('Invalid report structure');
});

// ============================================
// LAYER 5: VIOLATION FIXER
// ============================================
console.log('\n📍 Layer 5: Violation Fixer');

test('should attempt fixes for violations', async () => {
  const enforcer = new RuleEnforcer();
  
  // Create a violation
  const violations = [{
    rule: 'console-log-usage',
    severity: 'error',
    message: 'Console.log usage detected',
    context: {
      file: 'src/test.ts',
      line: 1,
      column: 1,
    },
    timestamp: new Date(),
  }];
  
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    newCode: 'function test() { console.log("debug"); }',
    userId: 'test-user',
    timestamp: new Date(),
  };
  
  const fixes = await enforcer.attemptRuleViolationFixes(violations, context);
  if (!fixes) throw new Error('No fixes returned');
  if (!Array.isArray(fixes)) throw new Error('Fixes should be an array');
  console.log(`   (${fixes.length} fix attempts)`);
});

test('should handle no-fix strategy gracefully', async () => {
  const enforcer = new RuleEnforcer();
  
  // Violation with no fix strategy
  const violations = [{
    rule: 'unknown-rule-xyz',
    severity: 'error',
    message: 'Unknown violation',
    context: {
      file: 'src/test.ts',
      line: 1,
      column: 1,
    },
    timestamp: new Date(),
  }];
  
  const context = {
    files: ['src/test.ts'],
    operation: 'write',
    newCode: 'function test() {}',
    userId: 'test-user',
    timestamp: new Date(),
  };
  
  const fixes = await enforcer.attemptRuleViolationFixes(violations, context);
  if (fixes.length !== 1) throw new Error('Should return one fix attempt');
  if (fixes[0].attempted) throw new Error('Should mark as not attempted');
  console.log(`   (error: ${fixes[0].error})`);
});

// ============================================
// END-TO-END
// ============================================
console.log('\n📍 End-to-End');

test('should complete full governance flow', async () => {
  const enforcer = new RuleEnforcer();
  
  // Step 1: Validate operation (async rules may load during validation)
  const context = {
    files: ['src/services/test.ts'],
    operation: 'write',
    newCode: `
      import { frameworkLogger } from '../core/framework-logger.js';
      
      export function processData(data: string): string {
        return data.toUpperCase();
      }
    `,
    userId: 'test-user',
    timestamp: new Date(),
  };
  
  const report = await enforcer.validateOperation('write', context);
  if (!report) throw new Error('Validation failed');
  
  // Step 2: Verify rules are loaded
  const ruleCount = enforcer.getRuleCount();
  if (ruleCount === 0) throw new Error('No rules loaded');
  
  // Step 3: If violations exist, attempt fixes
  if (!report.passed && report.errors.length > 0) {
    const fixes = await enforcer.attemptRuleViolationFixes(report.errors, context);
    if (!fixes) throw new Error('Fix attempt failed');
  }
  
  console.log(`   (report.passed: ${report.passed}, errors: ${report.errors.length}, rules: ${ruleCount})`);
});

test('should handle complex validation context', async () => {
  const enforcer = new RuleEnforcer();
  
  const complexContext = {
    files: [
      'src/services/user-service.ts',
      'src/types/user.ts',
      'src/utils/helpers.ts',
    ],
    operation: 'write',
    newCode: `
      // New user service implementation
      export class UserService {
        private users: Map<string, User> = new Map();
        
        async createUser(data: CreateUserInput): Promise<User> {
          const user: User = { id: crypto.randomUUID(), ...data };
          this.users.set(user.id, user);
          return user;
        }
      }
    `,
    userId: 'admin-user',
    timestamp: new Date(),
  };
  
  const report = await enforcer.validateOperation('write', complexContext);
  if (!report) throw new Error('Complex validation failed');
  console.log(`   (${complexContext.files.length} files, ${report.warnings.length} warnings)`);
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
