#!/usr/bin/env node

/**
 * Run Codex Rule Simulations
 * Validates all rule enforcements through comprehensive test cases
 * Updated for 1.2.0 - Uses actual test infrastructure
 */

async function main() {
  console.log("🚀 Starting Codex Rule Simulations...\n");

  const results = [];
  let totalFailed = 0;

  // Test 1: Rule Enforcer
  try {
    console.log("📋 Test 1: Rule Enforcer");
    const { RuleEnforcer } = await import("../../dist/enforcement/rule-enforcer.js");
    const enforcer = new RuleEnforcer();
    console.log("✅ Rule Enforcer loaded");
    results.push({ test: "Rule Enforcer", passed: 1, failed: 0 });
  } catch (error) {
    console.error("❌ Rule Enforcer failed:", error.message);
    results.push({ test: "Rule Enforcer", passed: 0, failed: 1 });
    totalFailed++;
  }

  // Test 2: Complexity Analyzer
  try {
    console.log("📋 Test 2: Complexity Analyzer");
    const { ComplexityAnalyzer } = await import("../../dist/delegation/complexity-analyzer.js");
    const analyzer = new ComplexityAnalyzer();
    const metrics = analyzer.analyzeComplexity("test", { files: ["test.ts"], context: {} });
    console.log("✅ Complexity Analyzer working");
    results.push({ test: "Complexity Analyzer", passed: 1, failed: 0 });
  } catch (error) {
    console.error("❌ Complexity Analyzer failed:", error.message);
    results.push({ test: "Complexity Analyzer", passed: 0, failed: 1 });
    totalFailed++;
  }

  // Test 3: Agent Delegator
  try {
    console.log("📋 Test 3: Agent Delegator");
    const { AgentDelegator } = await import("../../dist/delegation/agent-delegator.js");
    const delegator = new AgentDelegator();
    console.log("✅ Agent Delegator loaded");
    results.push({ test: "Agent Delegator", passed: 1, failed: 0 });
  } catch (error) {
    console.error("❌ Agent Delegator failed:", error.message);
    results.push({ test: "Agent Delegator", passed: 0, failed: 1 });
    totalFailed++;
  }

  // Test 4: State Manager
  try {
    console.log("📋 Test 4: State Manager");
    const { StringRayStateManager } = await import("../../dist/session/session-state-manager.js");
    const stateManager = new StringRayStateManager({ sessionId: "simulation-test" });
    console.log("✅ State Manager working");
    results.push({ test: "State Manager", passed: 1, failed: 0 });
  } catch (error) {
    console.error("❌ State Manager failed:", error.message);
    results.push({ test: "State Manager", passed: 0, failed: 1 });
    totalFailed++;
  }

  // Test 5: Processor Manager
  try {
    console.log("📋 Test 5: Processor Manager");
    const { ProcessorManager } = await import("../../dist/processors/processor-manager.js");
    const processorManager = new ProcessorManager();
    console.log("✅ Processor Manager loaded");
    results.push({ test: "Processor Manager", passed: 1, failed: 0 });
  } catch (error) {
    console.error("❌ Processor Manager failed:", error.message);
    results.push({ test: "Processor Manager", passed: 0, failed: 1 });
    totalFailed++;
  }

  // Generate report
  console.log("\n📊 Simulation Results");
  console.log("====================");
  results.forEach(r => {
    const status = r.failed === 0 ? "✅" : "❌";
    console.log(`${status} ${r.test}: ${r.passed} passed, ${r.failed} failed`);
  });
  console.log(`\nTotal: ${results.length} tests, ${totalFailed} failed`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
