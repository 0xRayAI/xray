/**
 * Kernel-to-Routing Pipeline Test
 * 
 * Tests the integration between kernel pattern detection and agent routing.
 * Verifies that kernel patterns influence agent selection and confidence.
 * 
 * Pipeline Tree: docs/pipeline-trees/KERNEL_ROUTING_PIPELINE_TREE.md
 * 
 * Data Flow:
 * analyzeDelegation(request)
 *     │
 *     ▼
 * Kernel.analyze(description)
 *     │
 *     ▼ (cascadePatterns, fatalAssumptions)
 * kernelPatternToAgent(patternId)
 * fatalAssumptionToAgent(assumptionId)
 *     │
 *     ▼
 * Agent Selection with boosted confidence
 *     │
 *     ▼
 * Return delegation result with kernel-influenced agents
 */

import { AgentDelegator } from '../../../dist/delegation/agent-delegator.js';
import { KernelAnalyzer } from '../../../dist/core/kernel-patterns.js';
import { StringRayStateManager } from '../../../dist/state/state-manager.js';
import { strRayConfigLoader } from '../../../dist/core/config-loader.js';

console.log('=== KERNEL-TO-ROUTING PIPELINE TEST ===\n');

const baselineDelegator = new AgentDelegator(new StringRayStateManager(), strRayConfigLoader);
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
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// Kernel Pattern Detection Tests
test("Kernel should detect P1 (RECURSIVE_LOOP)", () => {
  const kernel = new KernelAnalyzer();
  const result = kernel.analyze("RECURSIVE_LOOP in activity_log and spawn_governor");
  const hasP1 = result.cascadePatterns?.some(p => p.id === 'P1');
  if (!hasP1) throw new Error("P1 pattern not detected");
});

test("Kernel should detect P6 (SECURITY_VULNERABILITY)", () => {
  const kernel = new KernelAnalyzer();
  const result = kernel.analyze("SECURITY_VULNERABILITY found in security_audit");
  const hasP6 = result.cascadePatterns?.some(p => p.id === 'P6');
  if (!hasP6) throw new Error("P6 pattern not detected");
});

test("Kernel should detect A8 (Security Foundation) assumption", () => {
  const kernel = new KernelAnalyzer();
  const result = kernel.analyze("add security later after feature is done");
  const hasA8 = result.fatalAssumptions?.some(a => a.id === 'A8');
  if (!hasA8) throw new Error("A8 assumption not detected");
});

test("Kernel should detect A9 (Production Environment) assumption", () => {
  const kernel = new KernelAnalyzer();
  const result = kernel.analyze("tested locally on localhost secure");
  const hasA9 = result.fatalAssumptions?.some(a => a.id === 'A9');
  if (!hasA9) throw new Error("A9 assumption not detected");
});

// Kernel-to-Agent Mapping Tests
test("P1 should map to bug-triage-specialist", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "fix",
    description: "Infinite loop in function",
    sessionId: "test",
  });
  
  const hasBugTriage = result.agentDetails.some(a => a.name === 'bug-triage-specialist');
  if (!hasBugTriage) throw new Error("P1 not mapped to bug-triage-specialist");
});

test("P6 should map to security-auditor", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "security",
    description: "Check for SQL injection",
    sessionId: "test",
  });
  
  const hasSecurity = result.agentDetails.some(a => a.name === 'security-auditor');
  if (!hasSecurity) throw new Error("P6 not mapped to security-auditor");
});

test("A8 should map to security-auditor with boosted confidence", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "security",
    description: "add security after feature not now security optional",
    sessionId: "test",
  });
  
  const securityAgent = result.agentDetails.find(a => a.name === 'security-auditor');
  if (!securityAgent) throw new Error("A8 not mapped to security-auditor");
  if (securityAgent.confidence < 0.9) throw new Error("A8 confidence not boosted");
});

test("A1 should map to testing-lead", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "test",
    description: "Tests pass in dev but fail in CI",
    sessionId: "test",
  });
  
  const hasTesting = result.agentDetails.some(a => a.name === 'testing-lead');
  if (!hasTesting) throw new Error("A1 not mapped to testing-lead");
});

test("P5 should map to enforcer (VERSION_CHAOS)", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "update",
    description: "Upgrade all dependencies at once",
    sessionId: "test",
  });
  
  const hasEnforcer = result.agentDetails.some(a => a.name === 'enforcer');
  if (!hasEnforcer) throw new Error("P5 not mapped to enforcer");
});

// Confidence Boosting Tests
test("Kernel-detected security agents should have boosted confidence", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "security",
    description: "New API endpoint without auth",
    sessionId: "test",
  });
  
  const securityAgent = result.agentDetails.find(a => a.name === 'security-auditor');
  if (!securityAgent) throw new Error("Security agent not added");
  if (securityAgent.confidence <= 0.8) throw new Error("Confidence not boosted");
});

test("Multiple kernel patterns should apply together", async () => {
  const result = await baselineDelegator.analyzeDelegation({
    operation: "fix",
    description: "Security vulnerability in recursive function",
    sessionId: "test",
  });
  
  // Should have both bug-triage (P1) and security-auditor (P6)
  if (result.agentDetails.length < 2) throw new Error("Multiple patterns not applied");
});

// Summary
setTimeout(() => {
  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ All kernel-to-routing pipeline tests passed!' : '\n❌ Some tests failed');
  process.exit(failed > 0 ? 1 : 0);
}, 100);
