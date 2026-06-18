#!/usr/bin/env node
import { getMemoryRoutingProvider, resetMemoryRoutingProvider } from '../src/memory-routing/provider-registry.js';
import { getAgentCapabilitiesManager } from '../src/mcps/orchestrator/config/agent-capabilities.js';
import { ExecutionPlanner } from '../src/mcps/orchestrator/execution/execution-planner.js';

const TRAP =
  'TYPE: ontological-trap attestation-as-map consumer-boundary revalidation required';

async function main(): Promise<void> {
  resetMemoryRoutingProvider();
  const provider = await getMemoryRoutingProvider(true);
  console.log('provider:', provider.id);

  const caps = getAgentCapabilitiesManager();
  const agent = caps.selectAgentForTask(['governance'], 70, TRAP);
  console.log('selectAgentForTask:', agent);

  const planner = new ExecutionPlanner();
  const plan = await planner.createExecutionPlan(
    [
      {
        id: 'live-trap-routing-1',
        description: TRAP,
        type: 'governance',
        estimatedComplexity: 45,
      },
    ],
    'optimized',
  );

  for (const [assigned, tasks] of plan.agentAssignments) {
    console.log('plan assignment:', assigned, tasks.map((t) => t.id).join(', '));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});