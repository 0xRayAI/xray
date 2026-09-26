import { runGovernanceGate, governanceGateSummary } from './gate-runner.mjs';

export function runGovernancePass(task, ctx = {}) {
  const results = runGovernanceGate(task, ctx);
  const summary = governanceGateSummary(results);
  const blocking = results.filter((r) => !r.pass && r.enforcement === 'blocking');
  return {
    summary,
    blockingCount: blocking.length,
    results,
    intakeSummary: ctx.intake ?? null,
  };
}
