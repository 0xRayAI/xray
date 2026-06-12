/**
 * Task graph utilities — pure functions for dependency resolution,
 * topological sorting, and conflict resolution.
 *
 * Extracted from KernelOrchestrator for neutral access.
 */

import type { TaskDefinition } from "../agents/types.js";

/**
 * DFS-based topological sort with circular dependency detection.
 */
export function topologicalSort(tasks: TaskDefinition[]): TaskDefinition[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: TaskDefinition[] = [];

  const visit = (taskId: string) => {
    if (visiting.has(taskId)) {
      throw new Error(`Circular dependency detected: ${taskId}`);
    }
    if (visited.has(taskId)) {
      return;
    }

    visiting.add(taskId);

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.dependencies) {
      for (const dep of task.dependencies) {
        visit(dep);
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);

    if (task) {
      result.push(task);
    }
  };

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task.id);
    }
  }

  return result;
}

/**
 * Validates that all task dependencies are within the current task batch.
 * Throws a descriptive error listing cross-orchestrator dependencies.
 */
export function validateTaskDependencies(tasks: TaskDefinition[]): void {
  const taskIds = new Set(tasks.map((t) => t.id));
  const errors: string[] = [];

  for (const task of tasks) {
    if (task.dependencies && task.dependencies.length > 0) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          errors.push(
            `Task "${task.id}" depends on "${dep}" which is NOT in this orchestrator's task batch.\n` +
              `Available tasks in this batch: ${Array.from(taskIds).join(", ")}`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    const errorMessage =
      `[TEST ARCHITECTURE ERROR] Cross-orchestrator dependencies detected.\n\n` +
      `${errors.join("\n\n")}\n\n` +
      `This usually means:\n` +
      `1. You're creating multiple orchestrator instances in one test\n` +
      `2. Task dependencies are crossing orchestrator boundaries\n\n` +
      `FIX: Either:\n` +
      `A) Include the missing dependency task in this executeComplexTask() call\n` +
      `B) Use a single orchestrator for all dependent tasks\n` +
      `C) Remove the dependency if it's not needed\n\n` +
      `Example of correct usage:\n` +
      `  const orch = new XrayOrchestrator();\n` +
      `  await orch.executeComplexTask("test", [\n` +
      `    { id: "task-1" },\n` +
      `    { id: "task-2", dependencies: ["task-1"] }  // Same orchestrator\n` +
      `  ]);`;

    throw new Error(errorMessage);
  }
}

export interface ConflictInput {
  response?: unknown;
  proposed?: unknown;
  expertiseScore?: number;
}

export interface ConflictResult {
  response: string;
  expertiseScore: number;
}

/**
 * Resolve conflicts by majority vote or highest expertise score.
 */
export function resolveConflicts(
  conflicts: ConflictInput[],
  strategy?: "majority_vote" | "expert_priority",
): ConflictResult {
  if (conflicts.length === 0) {
    return { response: "", expertiseScore: 0 };
  }

  if (strategy === "majority_vote") {
    const votes: Record<string, number> = {};

    conflicts.forEach((conflict) => {
      const response = String(conflict.response ?? conflict.proposed ?? "");
      votes[response] = (votes[response] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(votes));
    const winner = Object.entries(votes).find(
      ([_, voteCount]) => voteCount === maxVotes,
    );

    if (winner) {
      const winningConflicts = conflicts.filter(
        (c) => String(c.response ?? c.proposed ?? "") === winner[0],
      );
      const avgExpertise =
        winningConflicts.reduce(
          (sum, c) => sum + (c.expertiseScore || 0),
          0,
        ) / winningConflicts.length;

      return { response: winner[0], expertiseScore: avgExpertise };
    }
  }

  // Fallback to highest expertise score
  const bestConflict = conflicts.reduce((best, current) =>
    (current.expertiseScore || 0) > (best.expertiseScore || 0)
      ? current
      : best,
  );

  return {
    response: String(bestConflict.response ?? bestConflict.proposed ?? ""),
    expertiseScore: bestConflict.expertiseScore || 0,
  };
}
