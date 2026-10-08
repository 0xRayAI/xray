/**
 * Locks EmergingPatternDetector clustering to a copy-and-rebuild Jaccard sum.
 *
 * The literal was measured from the oracle in this file. Sharing one keyword
 * set across patterns changes the total and must fail that literal.
 */

import { describe, expect, test } from "vitest";
import { EmergingPatternDetector } from "../../analytics/emerging-pattern-detector.js";
import { clusterKeywordGrowthTasks } from "../fixtures/cluster-keyword-growth.js";

const CLUSTER_SIMILARITY_THRESHOLD = 0.4;

/** Measured from pairwiseJaccardSum on clusterKeywordGrowthTasks. */
const lockedPairwiseJaccardSum = 1.1428571428571428;

interface ClusterTask {
  id: string;
  keywords: readonly string[];
}

interface OracleSum {
  sum: number;
  seedPairSizes: number[];
}

function copyAndRebuildJaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0;

  const set1 = new Set(left);
  const set2 = new Set(right);
  const intersection = new Set([...set1].filter((word) => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Pairwise Jaccard sum. Copies the cluster set, scores that copy, then
 * rebuilds a new set before adding the other task's keywords.
 */
function pairwiseJaccardSum(tasks: readonly ClusterTask[]): OracleSum {
  const assigned = new Set<string>();
  const sorted = [...tasks].sort((left, right) => right.keywords.length - left.keywords.length);
  const seedPairSizes: number[] = [];
  let sum = 0;

  for (const task of sorted) {
    if (assigned.has(task.id)) continue;

    let clusterKeywords = new Set(task.keywords);
    for (const other of sorted) {
      if (assigned.has(other.id) || other.id === task.id) continue;

      const copied = new Set(clusterKeywords);
      const score = copyAndRebuildJaccard(copied, new Set(other.keywords));
      sum += score;
      if (task.id === "seed") seedPairSizes.push(copied.size);

      if (score >= CLUSTER_SIMILARITY_THRESHOLD) {
        const rebuilt = new Set(copied);
        for (const keyword of other.keywords) rebuilt.add(keyword);
        clusterKeywords = rebuilt;
        assigned.add(other.id);
      }
    }

    assigned.add(task.id);
  }

  return { sum, seedPairSizes };
}

describe("EmergingPatternDetector pairwise Jaccard", () => {
  test("locks the copy-and-rebuild sum while the cluster keyword set grows", () => {
    for (const task of clusterKeywordGrowthTasks) {
      expect(task.description).toBe(task.keywords.join(" "));
    }

    const oracle = pairwiseJaccardSum(clusterKeywordGrowthTasks);
    const seedSize = oracle.seedPairSizes[0];
    const grownSize = oracle.seedPairSizes[1];
    expect(seedSize).toBe(5);
    expect(grownSize).toBe(6);

    expect(oracle.sum).toBe(lockedPairwiseJaccardSum);

    const detector = new EmergingPatternDetector();
    const host = detector as unknown as {
      jaccard(left: Set<string>, right: Set<string>): number;
    };
    const originalJaccard = host.jaccard.bind(detector);
    let productionSum = 0;
    host.jaccard = (left: Set<string>, right: Set<string>): number => {
      const score = originalJaccard(left, right);
      productionSum += score;
      return score;
    };

    detector.detectEmergingPatterns(
      clusterKeywordGrowthTasks.map((task) => ({
        taskId: task.id,
        taskDescription: task.description,
        routedAgent: "orchestrator",
        routedSkill: "orchestrator",
        success: true,
        confidence: 0.8,
      })),
    );

    expect(productionSum).toBe(lockedPairwiseJaccardSum);
  });
});
