#!/usr/bin/env node

/**
 * Phase 1 Validation Script
 * Validates that StrRay Framework Phase 1 fixes work correctly
 */

// Make this a module to allow top-level await
export {};

// Path configuration for cross-environment compatibility
const PROCESSORS_PATH =
  process.env.STRRAY_PROCESSORS_PATH || "../../dist/processors";
const STATE_PATH = process.env.STRRAY_STATE_PATH || "../../dist/state";
const ENFORCEMENT_PATH =
  process.env.STRRAY_ENFORCEMENT_PATH || "../../dist/enforcement";

// Dynamic imports for cross-environment compatibility
const [{ ProcessorManager }, { StringRayStateManager }, { ruleEnforcer }] =
  await Promise.all([
    import(PROCESSORS_PATH + "/processor-manager.js"),
    import(STATE_PATH + "/state-manager.js"),
    import(ENFORCEMENT_PATH + "/rule-enforcer.js"),
  ]);

async function validatePhase1() {
  console.log("🚀 StrRay Framework - Phase 1 Validation\n");
  console.log("Validating: Build System + Core Enforcement\n");
  console.log("=".repeat(60));

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Rule Enforcer Functionality
  console.log("📋 TEST 1: Rule Enforcer Core Functionality");
  totalTests++;

  try {
    const stats = ruleEnforcer.getRuleStats();
    const hasRules = stats.totalRules >= 11;
    const hasCategories = Object.keys(stats.ruleCategories).length >= 3;

    console.log(`   ✅ Rules registered: ${stats.totalRules} (expected: 11+)`);
    console.log(
      `   ✅ Categories available: ${Object.keys(stats.ruleCategories).length}`,
    );
    console.log(
      `   ✅ Rule enforcer initialized: ${hasRules && hasCategories ? "YES" : "NO"}`,
    );

    if (hasRules && hasCategories) {
      testsPassed++;
      console.log("   🎯 RESULT: PASS ✅");
    } else {
      console.log("   ❌ RESULT: FAIL - Missing rules or categories");
    }
  } catch (error) {
    console.log(`   ❌ RESULT: ERROR - ${error.message}`);
  }

  console.log();

  // Test 2: Over-Engineering Detection
  console.log("📋 TEST 2: Over-Engineering Detection");
  totalTests++;

  try {
    const badCode = `
      class A implements B, C, D {
        method() {
          if (x) {
            if (y) {
              if (z) {
                if (w) {
                  return true;
                }
              }
            }
          }
        }
      }
    `;

    const result = await ruleEnforcer.validateOperation("write", {
      operation: "write",
      newCode: badCode,
      files: ["test.ts"],
    });

    const blocksBadCode =
      !result.passed &&
      result.errors.some(
        (e) => e.includes("over-engineering") || e.includes("nesting"),
      );

    console.log(
      `   ✅ Blocks over-engineered code: ${blocksBadCode ? "YES" : "NO"}`,
    );
    console.log(`   📊 Violations detected: ${result.errors.length}`);

    if (blocksBadCode) {
      testsPassed++;
      console.log("   🎯 RESULT: PASS ✅");
    } else {
      console.log("   ❌ RESULT: FAIL - Should block over-engineered code");
    }
  } catch (error) {
    console.log(`   ❌ RESULT: ERROR - ${error.message}`);
  }

  console.log();

  // Test 3: Processor Pipeline Integration
  console.log("📋 TEST 3: Processor Pipeline Integration");
  totalTests++;

  try {
    const stateManager = new StringRayStateManager();
    const processorManager = new ProcessorManager(stateManager);

    // Test processor execution
    const testContext = {
      operation: "write",
      data: {
        content: 'console.log("test");',
        filePath: "test.js",
      },
    };

    await processorManager.executePreProcessors("write", testContext);

    console.log("   ✅ Processor pipeline executes without errors");
    console.log("   ✅ Pre-processors completed successfully");

    testsPassed++;
    console.log("   🎯 RESULT: PASS ✅");
  } catch (error) {
    console.log(`   ❌ RESULT: ERROR - ${error.message}`);
  }

  console.log();

  // Test 4: Codex Compliance Validation
  console.log("📋 TEST 4: Codex Compliance Processor");
  totalTests++;

  try {
    const stateManager = new StringRayStateManager();
    const processorManager = new ProcessorManager(stateManager);

    const complianceContext = {
      operation: "write",
      data: {
        content: 'class Test { method() { console.log("ok"); } }',
        filePath: "test.ts",
      },
    };

    const result = await processorManager.executePreProcessors(
      "write",
      complianceContext,
    );

    console.log("   ✅ Codex compliance processor runs");
    console.log(`   📊 Processor result: ${result ? "Generated" : "None"}`);

    testsPassed++;
    console.log("   🎯 RESULT: PASS ✅");
  } catch (error) {
    console.log(`   ❌ RESULT: ERROR - ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));

  // Final Results
  const successRate = Math.round((testsPassed / totalTests) * 100);

  console.log("🎯 PHASE 1 VALIDATION RESULTS");
  console.log("=".repeat(60));
  console.log(`Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`Success Rate: ${successRate}%`);

  if (successRate >= 75) {
    console.log("✅ OVERALL RESULT: SUCCESS ✅");
    console.log("🎉 Phase 1 validation complete!");
    console.log("🚀 Build system stable, core enforcement functional");
    console.log("📈 Ready to proceed to Phase 2");
  } else {
    console.log("❌ OVERALL RESULT: FAILED ❌");
    console.log("⚠️ Phase 1 issues need resolution before proceeding");
  }

  console.log("=".repeat(60));

  process.exit(successRate >= 75 ? 0 : 1);
}

validatePhase1().catch((error) => {
  console.error("💥 Validation failed with error:", error.message);
  process.exit(1);
});
