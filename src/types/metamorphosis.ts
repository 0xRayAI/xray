/**
 * MetamorphosisEngine interface — lifecycle hooks for self-evolution proposals.
 *
 * Extracted from postprocessor/metamorphosis/ for neutral access by kernel.
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
