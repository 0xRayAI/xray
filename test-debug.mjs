import { InferenceCycle } from './dist/inference/inference-cycle.js';

async function test() {
  console.error('Starting test...');
  const cycle = new InferenceCycle(process.cwd(), undefined, { skipApply: true });
  console.error('Cycle created');
  
  const proposals = [
    { id: "e2e-1", title: "E2E test fix", description: "Test fix proposal", type: "fix", confidence: 0.8, evidence: ["e2e evidence"] }
  ];
  
  console.error('Calling governExternalProposals...');
  
  // Patch methods to trace
  const orig = cycle.governProposals.bind(cycle);
  cycle.governProposals = async function(proposals) {
    console.error('>>> governProposals called');
    try {
      const result = await orig(proposals);
      console.error('<<< governProposals done');
      return result;
    } catch (e) {
      console.error('<<< governProposals error:', e.message);
      throw e;
    }
  };
  
  const origInvoke = cycle.invokeAgentInternal.bind(cycle);
  cycle.invokeAgentInternal = async function(agentName, prompt) {
    console.error('>>> invokeAgentInternal called:', agentName);
    try {
      const result = await origInvoke(agentName, prompt);
      console.error('<<< invokeAgentInternal done');
      return result;
    } catch (e) {
      console.error('<<< invokeAgentInternal error:', e.message);
      throw e;
    }
  };
  
  const origInvokeOpen = cycle.invokeViaOpencode.bind(cycle);
  cycle.invokeViaOpencode = async function(agentName, prompt) {
    console.error('>>> invokeViaOpencode called:', agentName);
    try {
      const result = await origInvokeOpen(agentName, prompt);
      console.error('<<< invokeViaOpencode done');
      return result;
    } catch (e) {
      console.error('<<< invokeViaOpencode error:', e.message);
      throw e;
    }
  };

  try {
    const result = await cycle.governExternalProposals(proposals);
    console.error('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
