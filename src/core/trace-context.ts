// src/core/trace-context.ts
// Centralized trace propagation for governance and observability

export interface TraceContext {
  traceId: string;
  parentId?: string;
  operation: string;
  governanceApproved: boolean;
  startTime: number;
  metadata?: Record<string, any>;
}

let currentTrace: TraceContext | null = null;

export function startTrace(operation: string, metadata?: Record<string, any>): TraceContext {
  const trace: TraceContext = {
    traceId: crypto.randomUUID(),
    operation,
    governanceApproved: false,
    startTime: Date.now(),
    metadata: metadata || {}
  };
  currentTrace = trace;
  return trace;
}

export function getCurrentTrace(): TraceContext | null {
  return currentTrace;
}

export function endTrace(approved: boolean = true): void {
  if (currentTrace) {
    currentTrace.governanceApproved = approved;
  }
  currentTrace = null;
}

export function propagateTrace(childOperation: string): TraceContext | null {
  if (!currentTrace) return null;
  return {
    ...currentTrace,
    parentId: currentTrace.traceId,
    operation: childOperation,
    startTime: Date.now()
  };
}

export function withTrace<T>(operation: string, fn: (trace: TraceContext) => Promise<T> | T): Promise<T> {
  const trace = startTrace(operation);
  try {
    const result = fn(trace);
    if (result instanceof Promise) {
      return result.finally(() => endTrace(true));
    }
    endTrace(true);
    return Promise.resolve(result);
  } catch (error) {
    endTrace(false);
    throw error;
  }
}