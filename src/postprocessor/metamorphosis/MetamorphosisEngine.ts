/**
 * MetamorphosisEngine — Phase 0.5 skeleton
 *
 * Plug into PostProcessor lifecycle hooks to observe phases and proposals.
 * No-op when none configured. Concrete engines will be built in Phase 2.
 *
 * Integration: PostProcessor accepts optional MetamorphosisEngine[] in constructor.
 * Each engine receives onPhase/onProposal lifecycle notifications.
 */

export interface MetamorphosisProposal {
  id: string;
  type: 'add' | 'modify' | 'remove';
  target: string;
  description: string;
  rationale: string;
  impact: 'low' | 'medium' | 'high';
}

export interface MetamorphosisEngine {
  /** Human-readable engine name (for logging) */
  name: string;

  /** Called when PostProcessor enters a phase */
  onPhase?(phase: string, context: unknown): Promise<void>;

  /** Called when a metamorphosis proposal is generated */
  onProposal?(proposal: MetamorphosisProposal): Promise<void>;
}
