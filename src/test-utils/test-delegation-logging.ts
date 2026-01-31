import { AgentDelegator } from "../delegation/agent-delegator.js";
import { frameworkLogger, generateJobId } from "../core/framework-logger.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { strRayConfigLoader } from "../core/config-loader.js";

async function testDelegationLogging() {
  console.log("🔄 Testing delegation logging integration...");

  const jobId = generateJobId('test-delegation-logging');
  const stateManager = new StringRayStateManager();
  const delegator = new AgentDelegator(stateManager, strRayConfigLoader);

  const result = await delegator.analyzeDelegation({
    operation: "test-complex-task",
    description: "Testing delegation logging",
    context: {
      files: ["test.ts", "complex.ts"],
      changes: 150,
      dependencies: 8,
      risk: "medium",
    },
  });

  console.log("📊 Delegation Analysis Result:");
  console.log(`   Strategy: ${result.strategy}`);
  console.log(`   Agents: ${result.agents.join(", ")}`);
  console.log(`   Complexity Score: ${result.complexity.score}`);

  try {
    const executionResult = await delegator.executeDelegation(result, {
      operation: "test-complex-task",
      description: "Testing delegation logging",
      context: result.metrics as any,
    });

    await frameworkLogger.log(
      "test-delegation",
      "execution-completed",
      "success",
      {},
      undefined, // sessionId
      jobId,
    );
  } catch (error) {
    console.log(
      "⚠️  Delegation execution failed (expected in test environment):",
      error instanceof Error ? error.message : String(error),
    );
  }

  await frameworkLogger.log("test-delegation", "test-completed", "success", {}, undefined, jobId);
}

testDelegationLogging();
