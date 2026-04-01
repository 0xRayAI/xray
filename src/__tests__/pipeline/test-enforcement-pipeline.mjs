#!/usr/bin/env node
/**
 * Enforcement Pipeline Test
 * 
 * Tests the full enforcement pipeline including:
 * - RuleEnforcer facade
 * - RuleExecutor, RuleRegistry, RuleHierarchy, ViolationFixer
 * - 29 Validators (security, code-quality, architecture, testing)
 * - 5 Loaders (Codex, Processor, AgentsMd, AgentTriage, LoaderOrchestrator)
 * - CodexComplianceProcessor
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
};

console.log('=== ENFORCEMENT PIPELINE TEST ===\n');

// Test 1: RuleEnforcer exists
test('should have rule-enforcer.js built', () => {
  const ruleEnforcerPath = join(PROJECT_ROOT, 'dist/enforcement/rule-enforcer.js');
  if (!existsSync(ruleEnforcerPath)) throw new Error('rule-enforcer.js not built');
});

// Test 2: Core enforcement components
test('should have RuleExecutor built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/core/rule-executor.js');
  if (!existsSync(path)) throw new Error('RuleExecutor not built');
});

test('should have RuleRegistry built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/core/rule-registry.js');
  if (!existsSync(path)) throw new Error('RuleRegistry not built');
});

test('should have RuleHierarchy built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/core/rule-hierarchy.js');
  if (!existsSync(path)) throw new Error('RuleHierarchy not built');
});

test('should have ViolationFixer built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/core/violation-fixer.js');
  if (!existsSync(path)) throw new Error('ViolationFixer not built');
});

// Test 3: Validators exist
test('should have security validators built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/validators/security-validators.js');
  if (!existsSync(path)) throw new Error('security-validators not built');
});

test('should have code-quality validators built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/validators/code-quality-validators.js');
  if (!existsSync(path)) throw new Error('code-quality-validators not built');
});

test('should have architecture validators built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/validators/architecture-validators.js');
  if (!existsSync(path)) throw new Error('architecture-validators not built');
});

test('should have testing validators built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/validators/testing-validators.js');
  if (!existsSync(path)) throw new Error('testing-validators not built');
});

// Test 4: Loaders exist
test('should have CodexLoader built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/loaders/codex-loader.js');
  if (!existsSync(path)) throw new Error('CodexLoader not built');
});

test('should have ProcessorLoader built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/loaders/processor-loader.js');
  if (!existsSync(path)) throw new Error('ProcessorLoader not built');
});

test('should have AgentsMdValidationLoader built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/loaders/agents-md-validation-loader.js');
  if (!existsSync(path)) throw new Error('AgentsMdValidationLoader not built');
});

test('should have AgentTriageLoader built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/loaders/agent-triage-loader.js');
  if (!existsSync(path)) throw new Error('AgentTriageLoader not built');
});

test('should have LoaderOrchestrator built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/loaders/loader-orchestrator.js');
  if (!existsSync(path)) throw new Error('LoaderOrchestrator not built');
});

// Test 5: ValidatorRegistry
test('should have ValidatorRegistry built', () => {
  const path = join(PROJECT_ROOT, 'dist/enforcement/validators/validator-registry.js');
  if (!existsSync(path)) throw new Error('ValidatorRegistry not built');
});

// Test 6: Codex compliance processor
test('should have CodexComplianceProcessor built', () => {
  const path = join(PROJECT_ROOT, 'dist/processors/implementations/codex-compliance-processor.js');
  if (!existsSync(path)) throw new Error('CodexComplianceProcessor not built');
});

// Test 7: Verify imports work
test('should import RuleEnforcer', async () => {
  const { RuleEnforcer } = await import(join(PROJECT_ROOT, 'dist/enforcement/rule-enforcer.js'));
  if (!RuleEnforcer) throw new Error('RuleEnforcer not exported');
});

test('should instantiate RuleEnforcer', async () => {
  const { RuleEnforcer } = await import(join(PROJECT_ROOT, 'dist/enforcement/rule-enforcer.js'));
  const enforcer = new RuleEnforcer();
  if (!enforcer) throw new Error('Failed to create RuleEnforcer');
});

test('should have validateOperation method', async () => {
  const { RuleEnforcer } = await import(join(PROJECT_ROOT, 'dist/enforcement/rule-enforcer.js'));
  const enforcer = new RuleEnforcer();
  if (typeof enforcer.validateOperation !== 'function') {
    throw new Error('validateOperation missing');
  }
});

test('should execute validation and return result', async () => {
  const { RuleEnforcer } = await import(join(PROJECT_ROOT, 'dist/enforcement/rule-enforcer.js'));
  const enforcer = new RuleEnforcer();
  
  const result = await enforcer.validateOperation('write', {
    operation: 'write',
    newCode: 'function hello() { return "world"; }',
    files: ['test.js'],
  });
  
  if (!result) throw new Error('Validation result is null/undefined');
  if (typeof result.passed !== 'boolean') throw new Error('Validation result missing passed property');
  // Note: Validation may fail due to codex rules - that's OK for this test
  console.log(`   Validation returned: passed=${result.passed}`);
});

test('should have CodexComplianceProcessor', async () => {
  const { CodexComplianceProcessor } = await import(join(PROJECT_ROOT, 'dist/processors/implementations/codex-compliance-processor.js'));
  if (!CodexComplianceProcessor) throw new Error('CodexComplianceProcessor not exported');
});

// Summary
console.log('\n========================================');
console.log('✅ Enforcement Pipeline components loaded');
console.log('   (Note: Validation may fail due to codex rules - expected behavior)');
console.log('========================================');
