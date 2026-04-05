/**
 * Kernel Pipeline Activation Script
 *
 * Triggers real delegations that should activate kernel patterns.
 * Observes the full pipeline in action.
 */
import { AgentDelegator } from '../delegation/agent-delegator.js';
import { StringRayStateManager } from '../state/state-manager.js';
import { strRayConfigLoader } from '../core/config-loader.js';
import { routingOutcomeTracker } from '../delegation/analytics/outcome-tracker.js';
import { patternPerformanceTracker } from '../analytics/pattern-performance-tracker.js';
const stateManager = new StringRayStateManager();
const delegator = new AgentDelegator(stateManager, strRayConfigLoader);
console.log('=== KERNEL PIPELINE ACTIVATION TEST ===\n');
// Test cases designed to trigger kernel patterns
const testCases = [
    {
        operation: 'security',
        description: 'Add new API endpoint with user authentication but skip input validation for SQL injection prevention',
        expected: ['P6', 'A8']
    },
    {
        operation: 'fix',
        description: 'Fix infinite recursion in the calculateTotals function - it keeps calling itself',
        expected: ['P1']
    },
    {
        operation: 'test',
        description: 'All tests pass on my machine but fail in CI - I think its an environment issue',
        expected: ['A1', 'A9']
    },
    {
        operation: 'deploy',
        description: 'Run the deployment script but getting permission denied on execution',
        expected: ['P8']
    },
    {
        operation: 'update',
        description: 'Upgrade all dependencies to latest version at once - we need everything current',
        expected: ['P5']
    },
    {
        operation: 'refactor',
        description: 'The tests all pass but we still have bugs in production - I do not understand why',
        expected: ['A2', 'A3']
    },
    {
        operation: 'create',
        description: 'Skip security for internal API - its only used internally so authentication is optional',
        expected: ['A8']
    },
    {
        operation: 'optimize',
        description: 'Make the code 80% faster - use aggressive caching everywhere',
        expected: ['A7']
    },
];
let kernelEvents = 0;
let learningEvents = 0;
async function runTest(testCase) {
    console.log(`\n--- Testing: ${testCase.operation} ---`);
    console.log(`Description: ${testCase.description}`);
    console.log(`Expected patterns: ${testCase.expected.join(', ')}`);
    try {
        const result = await delegator.analyzeDelegation({
            operation: testCase.operation,
            description: testCase.description,
            sessionId: 'kernel-activation-test',
        });
        console.log(`Selected agents:`);
        result.agentDetails.forEach(agent => {
            console.log(`  - ${agent.name}: ${agent.role} (confidence: ${agent.confidence})`);
        });
        kernelEvents++;
        // Check outcomes tracked
        const outcomes = routingOutcomeTracker.getOutcomes();
        console.log(`Total outcomes tracked: ${outcomes.length}`);
        learningEvents++;
    }
    catch (error) {
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function main() {
    console.log('Initial state:');
    console.log(`  Outcomes: ${routingOutcomeTracker.getOutcomes().length}`);
    for (const testCase of testCases) {
        await runTest(testCase);
        await new Promise(r => setTimeout(r, 100));
    }
    console.log('\n=== FINAL STATE ===');
    console.log(`Delegations performed: ${kernelEvents}`);
    console.log(`Learning events: ${learningEvents}`);
    console.log(`Total outcomes: ${routingOutcomeTracker.getOutcomes().length}`);
    // Check pattern metrics
    const patternMetrics = patternPerformanceTracker.getMetrics?.() || {};
    console.log(`Pattern types tracked: ${Object.keys(patternMetrics).length}`);
    console.log('\n=== CHECKING ACTIVITY LOG ===');
    // Log should show kernel-pattern-applied events
}
main().catch(console.error);
//# sourceMappingURL=activate-kernel-pipeline.js.map