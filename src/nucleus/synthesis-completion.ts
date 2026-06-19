/**
 * Post-checkpoint side effects — meta-inference refresh + repertoire feedback.
 */

import { getMemoryRoutingProvider } from '../memory-routing/index.js';
import type { PersistedLeadDevPlan } from './lead-dev-plan-persistence.js';
import { getSynthesisConsultTodos, isSynthesisRealignmentPlan } from './lead-dev-plan-persistence.js';
import type { SynthesisCheckpointState } from './synthesis.js';

export async function runSynthesisCheckpointSideEffects(
  projectRoot: string,
  sessionId: string,
  plan: PersistedLeadDevPlan | null,
  completedState: SynthesisCheckpointState,
): Promise<void> {
  try {
    const provider = await getMemoryRoutingProvider();
    if (provider.refreshMetaInference) {
      await provider.refreshMetaInference().catch(() => undefined);
    }
    if (provider.ingestFeedback && plan && isSynthesisRealignmentPlan(plan)) {
      const consultTodos = getSynthesisConsultTodos(plan);
      provider.ingestFeedback({
        timestamp: new Date().toISOString(),
        sessionId,
        taskId: `synthesis-checkpoint-${completedState.synthesisCount}`,
        assignedAgent: 'orchestrator',
        memorySignals: ['synthesis', ...consultTodos.map((t) => t.subagent)],
        complexity: 30,
        success: true,
        durationMs: 0,
      });
    }
  } catch {
    // non-blocking — checkpoint already cleared
  }
}