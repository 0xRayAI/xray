/**
 * Tasks whose cluster keyword set grows across pairs.
 *
 * Lengths are unique so keyword-count sort order is fixed:
 * "other" is a disjoint pattern, then "seed" absorbs "grow".
 * The copied set gains "teal" before "after" and "later" are scored.
 */
export interface ClusterKeywordGrowthTask {
  id: string;
  description: string;
  keywords: readonly string[];
}

export const clusterKeywordGrowthTasks: readonly ClusterKeywordGrowthTask[] = [
  {
    id: "other",
    description: "mint coral olive navy plum ivory",
    keywords: ["mint", "coral", "olive", "navy", "plum", "ivory"],
  },
  {
    id: "seed",
    description: "red blue green gold amber",
    keywords: ["red", "blue", "green", "gold", "amber"],
  },
  {
    id: "grow",
    description: "red blue green teal",
    keywords: ["red", "blue", "green", "teal"],
  },
  {
    id: "after",
    description: "gold teal red",
    keywords: ["gold", "teal", "red"],
  },
  {
    id: "later",
    description: "teal cyan",
    keywords: ["teal", "cyan"],
  },
];
