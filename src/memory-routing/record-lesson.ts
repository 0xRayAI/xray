import { ensureMemoryRoutingProviderSync } from "./provider-registry.js";

export interface LessonInput {
  operation: string;
  success: boolean;
  taskId: string;
  assignedAgent: string;
  sessionId: string;
  /** Signals the finished task already named. When set, text matching is not used. */
  signals?: string[];
  /** Approaches, solutions, or the wrong turn from the sessions that named the law. */
  lesson?: string;
}

/**
 * A finished task names the signals its text actually matched and says
 * whether the outcome was good. That is the one-tenth step. No match, no write.
 */
export function recordLesson(input: LessonInput): string[] {
  const provider = ensureMemoryRoutingProviderSync();
  if (provider.id === "null" || !provider.ingestFeedback) return [];

  const named = input.signals ?? provider.buildRoutingContext(input.operation).matchedSignals;
  const names = [...new Set(named.filter((name) => name.length > 0))];
  if (names.length === 0) return [];

  provider.ingestFeedback({
    timestamp: new Date().toISOString(),
    sessionId: input.sessionId,
    taskId: input.taskId,
    assignedAgent: input.assignedAgent,
    memorySignals: names,
    complexity: 0,
    success: input.success,
    durationMs: 0,
    lesson: input.lesson ?? "",
  });
  return names;
}
