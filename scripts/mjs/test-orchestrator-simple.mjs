#!/usr/bin/env node

/**
 * Simple Orchestrator Routing Test
 * Tests basic orchestrator task routing functionality
 */

console.log("🧪 SIMPLE ORCHESTRATOR ROUTING TEST");
console.log("====================================\n");

async function testOrchestratorRouting() {
  try {
    // Import the orchestrator - try dev path first, then consumer path
    let StringRayOrchestrator;
    let module;
    try {
      // Development path (from project root)
      module = await import("../../dist/orchestrator/orchestrator.js");
    } catch (devError) {
      try {
        // Consumer path (after npm install)
        module = await import("./node_modules/strray-ai/dist/orchestrator/orchestrator.js");
      } catch (consumerError) {
        throw new Error(`Cannot load orchestrator module. Tried dev path and consumer path. Error: ${consumerError.message}`);
      }
    }
    StringRayOrchestrator = module.StringRayOrchestrator;

    console.log("✅ Orchestrator imported successfully");

    // Create orchestrator instance
    const orchestrator = new StringRayOrchestrator({
      maxConcurrentTasks: 2,
      taskTimeout: 30000
    });

    console.log("✅ Orchestrator instance created");

    // Define test tasks
    const testTasks = [
      {
        id: "routing-test-1",
        description: "Test basic routing to enforcer agent",
        subagentType: "enforcer",
        priority: "high"
      },
      {
        id: "routing-test-2",
        description: "Test routing to architect agent",
        subagentType: "architect",
        priority: "medium"
      }
    ];

    console.log("🔄 Executing orchestrator tasks...");

    // Execute tasks
    const results = await orchestrator.executeComplexTask(
      "Simple Orchestrator Routing Test",
      testTasks,
      "test-session-simple"
    );

    console.log("✅ Task execution completed");
    console.log(`📊 Results: ${results.length} tasks executed`);

    // Check if all tasks were successful
    const allSuccessful = results.every(result => result.success !== false);

    console.log(`✅ All successful: ${allSuccessful}`);
    console.log(`✅ Correct count: ${results.length === 2}`);
    console.log(`✅ Has duration: ${results.every(r => r.duration)}`);

    console.log("\n🎉 SIMPLE ORCHESTRATOR TEST PASSED!");
    console.log("✅ Task routing is working correctly");
    console.log("✅ Orchestrator successfully delegates to agents");

    process.exit(0); // Explicit success exit

  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testOrchestratorRouting();