import {
  isLoggingEnabled,
  shouldLog,
  getLoggingConfig,
} from "./logging-config.js";
import { promises as fs, existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Generate a unique job ID for tracking work sessions
 */
export function generateJobId(prefix: string = "job"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// Global job context for correlation across all framework operations
let currentJobContext: JobContext | null = null;

let currentTraceId: string | null = null;
let currentSpanId: string | null = null;
let currentParentSpanId: string | null = null;

export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function generateSpanId(): string {
  return `span-${Math.random().toString(36).substring(2, 10)}`;
}

export function setTraceContext(traceId: string, parentSpanId?: string): string {
  currentTraceId = traceId;
  currentSpanId = generateSpanId();
  currentParentSpanId = parentSpanId ?? null;
  return currentSpanId;
}

export function getTraceContext(): { traceId: string | null; spanId: string | null; parentSpanId: string | null } {
  return { traceId: currentTraceId, spanId: currentSpanId, parentSpanId: currentParentSpanId };
}

export function clearTraceContext(): void {
  currentTraceId = null;
  currentSpanId = null;
  currentParentSpanId = null;
}

export function withTraceContext<T>(
  traceId: string,
  operation: (spanId: string) => Promise<T> | T,
  parentSpanId?: string,
): Promise<T> {
  const prevTrace = currentTraceId;
  const prevSpan = currentSpanId;
  const prevParent = currentParentSpanId;
  const spanId = setTraceContext(traceId, parentSpanId);
  try {
    const result = operation(spanId);
    if (result instanceof Promise) {
      return result.finally(() => {
        currentTraceId = prevTrace;
        currentSpanId = prevSpan;
        currentParentSpanId = prevParent;
      });
    }
    currentTraceId = prevTrace;
    currentSpanId = prevSpan;
    currentParentSpanId = prevParent;
    return Promise.resolve(result);
  } catch (err) {
    currentTraceId = prevTrace;
    currentSpanId = prevSpan;
    currentParentSpanId = prevParent;
    throw err;
  }
}

export function getCurrentJobId(): string | null {
  return currentJobContext?.jobId || null;
}

export function setCurrentJobContext(jobId?: string): JobContext {
  currentJobContext = new JobContext(jobId);
  return currentJobContext;
}

export function withJobContext<T>(
  operation: () => Promise<T> | T,
  jobId?: string,
): Promise<T> {
  const originalContext = currentJobContext;
  const jobContext = setCurrentJobContext(jobId);
  try {
    const result = operation();
    if (result instanceof Promise) {
      return result.finally(async () => {
        // Auto-complete job on operation finish
        await jobContext.complete(true).catch(() => {});
        // Restore original context
        currentJobContext = originalContext;
      });
    } else {
      // Sync operation - complete immediately
      jobContext.complete(true).catch(() => {});
      currentJobContext = originalContext;
      return Promise.resolve(result);
    }
  } catch (error) {
    // Error occurred - complete job with failure
    jobContext.complete(false, { error: String(error) }).catch(() => {});
    currentJobContext = originalContext;
    throw error;
  }
}

export type LogStatus = "success" | "error" | "info" | "debug" | "warning";

/**
 * Job context for tracking work sessions
 * Enhanced with outcome and complexity accuracy tracking for pattern analytics
 */
export type Outcome = "success" | "fail" | "escalated" | "auto-fixed";

export type ComplexityAccuracy =
   | "underestimated"
   | "accurate"
   | "overestimated";

export class JobContext {
  public readonly jobId: string;
  public readonly startTime: number;
  public complexityScore?: number;
  public agentUsed?: string;
  public operationType?: string;

  // NEW: Outcome tracking for pattern analysis
  public outcome?: Outcome;

  // NEW: Predicted duration for accuracy comparison (in ms)
  public predictedDuration?: number;

  constructor(jobId?: string) {
    this.jobId = jobId || generateJobId("auto");
    this.startTime = Date.now();
  }

  /**
   * Set the outcome after task completion
   */
  setOutcome(
    success: boolean,
    escalated: boolean = false,
    autoFixed: boolean = false,
  ): void {
    if (escalated) this.outcome = "escalated";
    else if (autoFixed) this.outcome = "auto-fixed";
    else this.outcome = success ? "success" : "fail";
  }

  /**
   * Set predicted duration for complexity accuracy comparison
   */
  setPredictedDuration(completionTimeMs: number): void {
    this.predictedDuration = completionTimeMs;
  }

  /**
   * Log job completion with diagnostic info
   * Enhanced with outcome and complexity accuracy tracking
   */
  async complete(success: boolean = true, details?: any) {
    const actualDuration = Date.now() - this.startTime;

    // Calculate complexity accuracy if we have both predicted and actual
    let complexityAccuracy: ComplexityAccuracy | undefined;
    if (this.complexityScore && this.predictedDuration) {
      const ratio = actualDuration / this.predictedDuration;
      if (ratio > 1.5) {
        complexityAccuracy = "underestimated";
      } else if (ratio < 0.5) {
        complexityAccuracy = "overestimated";
      } else {
        complexityAccuracy = "accurate";
      }
    } else if (this.complexityScore && actualDuration) {
      // Fallback: estimate predicted based on complexity score
      const estimatedPredicted = this.complexityScore * 1000; // 1 second per complexity point
      const ratio = actualDuration / estimatedPredicted;
      if (ratio > 1.5) {
        complexityAccuracy = "underestimated";
      } else if (ratio < 0.5) {
        complexityAccuracy = "overestimated";
      } else {
        complexityAccuracy = "accurate";
      }
    }

    // Determine final outcome
    const finalOutcome = this.outcome || (success ? "success" : "fail");

    await frameworkLogger.log(
      "job-context",
      "job-completed",
      success ? "success" : "error",
      {
        duration: actualDuration,
        complexityScore: this.complexityScore,
        agentUsed: this.agentUsed,
        operationType: this.operationType,
        outcome: finalOutcome,
        complexityAccuracy,
        predictedDuration: this.predictedDuration,
        ...details,
      },
      undefined, // sessionId
      this.jobId,
    );
  }
}

export interface FrameworkLogEntry {
  timestamp: number;
  component: string;
  action: string;
  status: LogStatus;
  agent: string;
  sessionId?: string;
  jobId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  details?: any;
}

export class FrameworkUsageLogger {
  private logs: FrameworkLogEntry[] = [];
  private maxLogs = 1000;
  private buffer: string[] = [];
  private flushTimer?: ReturnType<typeof setTimeout> | undefined;
  private flushing = false;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private readonly MAX_BUFFER_SIZE = 100;

  async log(
    component: string,
    action: string,
    status: LogStatus,
    details?: any,
    sessionId?: string,
    jobId?: string,
  ) {
    if (!isLoggingEnabled()) {
      return;
    }

    if (!shouldLog(status)) {
      return;
    }

    const actualJobId = jobId || getCurrentJobId() || generateJobId("auto");

    if (!actualJobId) {
      throw new Error("JobId generation failed");
    }

    const entry: FrameworkLogEntry = {
      timestamp: Date.now(),
      component,
      action,
      status,
      agent: "orchestrator",
      ...(sessionId && { sessionId }),
      jobId: actualJobId,
      ...(currentTraceId && { traceId: currentTraceId }),
      ...(currentSpanId && { spanId: currentSpanId }),
      ...(currentParentSpanId && { parentSpanId: currentParentSpanId }),
      details,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.bufferEntry(entry);
  }

  private bufferEntry(entry: FrameworkLogEntry): void {
    const jobIdPart = entry.jobId ? `[${entry.jobId}] ` : "";
    const tracePart = entry.traceId ? `[${entry.traceId}.${entry.spanId}] ` : "";
    const detailsPart = entry.details
      ? ` | ${(() => { try { return JSON.stringify(entry.details); } catch { return String(entry.details); } })()}`
      : "";
    const line = `${new Date(entry.timestamp).toISOString()} ${jobIdPart}${tracePart}[${entry.component}] ${entry.action} - ${entry.status.toUpperCase()}${detailsPart}\n`;
    this.buffer.push(line);

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer();
      return;
    }

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = undefined;
        this.flushBuffer();
      }, this.FLUSH_INTERVAL_MS);
      if (this.flushTimer && typeof this.flushTimer === "object" && "unref" in this.flushTimer) {
        this.flushTimer.unref();
      }
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const toWrite = this.buffer.splice(0, this.buffer.length);
    const data = toWrite.join("");

    try {
      const cwd = process.cwd();
      if (!cwd) return;

      const logDir = join(cwd, "logs", "framework");
      const logFile = join(logDir, "activity.log");

      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      await fs.appendFile(logFile, data).catch(() => {});
      this.flushing = false;
    } catch {
      this.flushing = false;
    }
  }

  getRecentLogs(count: number = 50): FrameworkLogEntry[] {
    return this.logs.slice(-count);
  }

  getComponentUsage(component: string): FrameworkLogEntry[] {
    return this.logs.filter((log) => log.component === component);
  }

  // TODO: Implement or remove — currently a no-op placeholder
  printRundown() {
    // Framework usage analytics placeholder
  }
}

export const frameworkLogger = new FrameworkUsageLogger();
