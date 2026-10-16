/** Types for work-freshness.mjs. The hook runtime imports the mjs directly. */

export interface FreshnessInput {
  behind?: number;
  wornSuit?: string | null;
  publishedSuit?: string | null;
  repoName?: string | null;
  repoVersion?: string | null;
  stashCount?: number;
}

export interface FreshnessDecision {
  stale: boolean;
  reason: string;
}

export interface WorkSnapshot {
  behind: number;
  stashCount: number;
  repoName: string | null;
  repoVersion: string | null;
  wornSuit: string | null;
  publishedSuit: string | null;
}

export interface FreshnessRefresh extends WorkSnapshot {
  freshnessLine: string;
}

export function compareVersions(left: string, right: string): -1 | 0 | 1;
export function decideFreshness(input: FreshnessInput): FreshnessDecision;
export function describeFreshness(input: FreshnessInput): string;
export function wornSuitVersion(projectRoot?: string, opts?: { liveGlobal?: boolean }): string | null;
export function readWorkSnapshot(projectRoot: string): WorkSnapshot;
export function readSavedFreshness(projectRoot: string): string | null;
export function probeFreshness(projectRoot: string): FreshnessDecision;
export function refreshFreshness(projectRoot: string): FreshnessRefresh;
