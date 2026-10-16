import { ensureMemoryRoutingProviderSync } from "./provider-registry.js";

export interface LessonInput {
  operation: string;
  success: boolean;
  taskId: string;
  assignedAgent: string;
  sessionId: string;
  /**
   * Signals the finished task already named. When set, text matching is not used.
   * An empty list with a lesson still stores that lesson under a name taken from the task.
   */
  signals?: string[];
  /** Approaches, solutions, or the wrong turn from the sessions that named the law. */
  lesson?: string;
}

/**
 * Hyphenated phrase whose spaced form is still inside the task.
 * A later routing read of that same task hits the name.
 */
function signalNameForUnmatchedLesson(task: string): string | null {
  const words = task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  const normalized = task.toLowerCase();
  const kept: string[] = [];
  for (const word of words) {
    const next = [...kept, word];
    const phrase = next.join(" ");
    const hyphen = next.join("-");
    if (!normalized.includes(phrase) || hyphen.length > 120) break;
    kept.push(word);
  }
  if (kept.length === 0) return null;
  return kept.join("-");
}

/**
 * A finished task names the signals its text actually matched and says
 * whether the outcome was good. That is the one-tenth step.
 * A lesson with no matched signal is stored under a hyphenated name from the
 * task, so the same task text recalls it. No lesson and no match, no write.
 */
export function recordLesson(input: LessonInput): string[] {
  const provider = ensureMemoryRoutingProviderSync();
  if (provider.id === "null" || !provider.ingestFeedback) return [];

  const lesson = (input.lesson ?? "").trim();
  const supplied = input.signals;
  const named = supplied !== undefined
    ? supplied
    : provider.buildRoutingContext(input.operation).matchedSignals;
  let names = [...new Set(named.filter((name) => name.length > 0))];
  if (names.length === 0 && lesson.length > 0) {
    const coined = signalNameForUnmatchedLesson(input.operation);
    if (coined) names = [coined];
  }
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
