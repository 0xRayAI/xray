// Consumer runtime compat shim from prior 0xRay releases (1-line min per Scope Rule; primary xray paths + .xray fallbacks)

import { XrayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface AgentInvocation {
  id: string;
  agentName: string;
  agentType: AgentType;
  timestamp: number;
  operation: string;
  description: string;
  complexityLevel: ComplexityLevel;
  complexityScore: number;
  duration: number;
  success: boolean;
  error: string | undefined;
  sessionId: string | undefined;
  parentTaskId: string | undefined;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  metadata: Record<string, unknown> | undefined;
}

export type AgentType =
  | "architect"
  | "code-analyzer"
  | "code-reviewer"
  | "researcher"
  | "frontend-engineer"
  | "backend-engineer"
  | "devops-engineer"
  | "security-auditor"
  | "database-engineer"
  | "testing-lead"
  | "performance-engineer"
  | "refactorer"
  | "bug-triage-specialist"
  | "strategist"
  | "tech-writer"
  | "content-creator"
  | "seo-consultant"
  | "growth-strategist"
  | "log-monitor"
  | "multimodal-looker"
  | "mobile-developer"
  | "frontend-ui-ux-engineer"
  | "custom"
  | "unknown";

export type ComplexityLevel = "simple" | "moderate" | "complex" | "enterprise";

export interface AgentInvocationSummary {
  agentName: string;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  successRate: number;
  averageDuration: number;
  averageComplexity: number;
  lastInvoked: number;
  firstInvoked: number;
  operations: string[];
}

export interface TimePeriodSummary {
  period: string;
  periodType: "hour" | "day" | "week" | "month";
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  successRate: number;
  averageDuration: number;
  agents: Record<string, number>;
}

export interface ComplexitySummary {
  level: ComplexityLevel;
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  successRate: number;
  averageDuration: number;
  agents: Record<string, number>;
}

export interface AggregatedAgentMetrics {
  summary: {
    totalInvocations: number;
    totalAgents: number;
    timeRange: { start: number; end: number };
    overallSuccessRate: number;
    averageDuration: number;
  };
  byAgent: Record<string, AgentInvocationSummary>;
  byTimePeriod: Record<string, TimePeriodSummary>;
  byComplexity: Record<string, ComplexitySummary>;
}

export interface MetricsRetentionConfig {
  maxEntries: number;
  maxAgeMs: number;
  enableAutoCleanup: boolean;
  cleanupIntervalMs: number;
}

export interface MetricsExport {
  format: "json" | "csv" | "summary" | "detailed";
  data: unknown;
  exportedAt: number;
  entryCount: number;
  metadata: {
    fromDate: number | undefined;
    toDate: number | undefined;
    filter: Record<string, unknown> | undefined;
  };
}

export interface AgentMetricsFilter {
  agentNames?: string[];
  agentTypes?: AgentType[];
  timeRange?: { start: number; end: number };
  complexityLevels?: ComplexityLevel[];
  successOnly?: boolean;
  failureOnly?: boolean;
  sessionId?: string;
}

const DEFAULT_RETENTION_CONFIG: MetricsRetentionConfig = {
  maxEntries: 10000,
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableAutoCleanup: true,
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};

const INVOCATION_STORE_KEY = "agent_invocations";

interface AgentAcc {
  count: number;
  success: number;
  duration: number;
  complexity: number;
  minTs: number;
  maxTs: number;
  operations: Set<string>;
}

interface CountAcc {
  count: number;
  success: number;
  duration: number;
  agents: Record<string, number>;
}

interface HourParts {
  hour: string;
  day: string;
  month: string;
}

interface PeriodKeys {
  timestamp: number;
  hour: string;
  day: string;
  week: string;
  month: string;
}

interface PeriodCursor {
  hourCache: Map<number, HourParts>;
  weekCache: Map<number, string>;
  dayStart: number;
  dayEnd: number;
  week: string;
}

const periodKeyCache = new WeakMap<AgentInvocation, PeriodKeys>();


export class AgentMetricsSystem {
  private stateManager: XrayStateManager;
  private retentionConfig: MetricsRetentionConfig;
  private cleanupInterval: NodeJS.Timeout | undefined;
  private initialized = false;

  constructor(
    stateManager: XrayStateManager,
    retentionConfig: Partial<MetricsRetentionConfig> = {},
  ) {
    this.stateManager = stateManager;
    this.retentionConfig = { ...DEFAULT_RETENTION_CONFIG, ...retentionConfig };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.retentionConfig.enableAutoCleanup) {
      this.startAutoCleanup();
    }

    this.initialized = true;
    frameworkLogger.log("agent-metrics", "initialized", "info", {
      retentionConfig: this.retentionConfig,
    });
  }

  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.retentionConfig.cleanupIntervalMs);
  }

  private performCleanup(): void {
    const removed = this.cleanup(
      this.retentionConfig.maxAgeMs,
      this.retentionConfig.maxEntries,
    );
    if (removed.total > 0) {
      frameworkLogger.log("agent-metrics", "auto-cleanup", "info", removed);
    }
  }

  private getInvocations(): AgentInvocation[] {
    return (
      (this.stateManager.get(INVOCATION_STORE_KEY) as AgentInvocation[]) || []
    );
  }

  private saveInvocations(invocations: AgentInvocation[]): void {
    this.stateManager.set(INVOCATION_STORE_KEY, invocations);
  }

  private generateId(): string {
    return `inv-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private newAgentAcc(): AgentAcc {
    return {
      count: 0,
      success: 0,
      duration: 0,
      complexity: 0,
      minTs: Number.POSITIVE_INFINITY,
      maxTs: Number.NEGATIVE_INFINITY,
      operations: new Set<string>(),
    };
  }

  private addAgent(acc: AgentAcc, inv: AgentInvocation): void {
    acc.count += 1;
    if (inv.success) acc.success += 1;
    acc.duration += inv.duration;
    acc.complexity += inv.complexityScore;
    acc.minTs = Math.min(acc.minTs, inv.timestamp);
    acc.maxTs = Math.max(acc.maxTs, inv.timestamp);
    acc.operations.add(inv.operation);
  }

  private finishAgent(agentName: string, acc: AgentAcc): AgentInvocationSummary {
    return {
      agentName,
      totalInvocations: acc.count,
      successfulInvocations: acc.success,
      failedInvocations: acc.count - acc.success,
      successRate: (acc.success / acc.count) * 100,
      averageDuration: acc.duration / acc.count,
      averageComplexity: acc.complexity / acc.count,
      lastInvoked: acc.maxTs,
      firstInvoked: acc.minTs,
      operations: [...acc.operations],
    };
  }

  private newCountAcc(): CountAcc {
    return { count: 0, success: 0, duration: 0, agents: {} };
  }

  private addCount(acc: CountAcc, inv: AgentInvocation): void {
    acc.count += 1;
    if (inv.success) acc.success += 1;
    acc.duration += inv.duration;
    acc.agents[inv.agentName] = (acc.agents[inv.agentName] || 0) + 1;
  }

  private finishCount(acc: CountAcc): {
    totalInvocations: number;
    successfulInvocations: number;
    failedInvocations: number;
    successRate: number;
    averageDuration: number;
    agents: Record<string, number>;
  } {
    return {
      totalInvocations: acc.count,
      successfulInvocations: acc.success,
      failedInvocations: acc.count - acc.success,
      successRate: (acc.success / acc.count) * 100,
      averageDuration: acc.duration / acc.count,
      agents: acc.agents,
    };
  }

  trackInvocation(params: {
    agentName: string;
    agentType: AgentType;
    operation: string;
    description?: string;
    complexityLevel?: ComplexityLevel;
    complexityScore?: number;
    duration?: number;
    success: boolean;
    error?: string;
    sessionId?: string;
    parentTaskId?: string;
    inputTokens?: number;
    outputTokens?: number;
    metadata?: Record<string, unknown>;
  }): AgentInvocation {
    const invocation: AgentInvocation = {
      id: this.generateId(),
      agentName: params.agentName,
      agentType: params.agentType,
      timestamp: Date.now(),
      operation: params.operation,
      description: params.description || params.operation,
      complexityLevel: params.complexityLevel || "moderate",
      complexityScore: params.complexityScore || 25,
      duration: params.duration || 0,
      success: params.success,
      error: params.error,
      sessionId: params.sessionId,
      parentTaskId: params.parentTaskId,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      metadata: params.metadata,
    };

    const invocations = this.getInvocations();
    invocations.push(invocation);

    if (invocations.length > this.retentionConfig.maxEntries) {
      invocations.shift();
    }

    this.saveInvocations(invocations);

    frameworkLogger.log("agent-metrics", "invocation-tracked", "info", {
      id: invocation.id,
      agentName: invocation.agentName,
      success: invocation.success,
      duration: invocation.duration,
    });

    return invocation;
  }

  trackSuccess(params: Omit<Parameters<typeof this.trackInvocation>[0], "success" | "error">): AgentInvocation {
    return this.trackInvocation({
      ...params,
      success: true,
    });
  }

  trackFailure(params: Omit<Parameters<typeof this.trackInvocation>[0], "success"> & { error: string }): AgentInvocation {
    return this.trackInvocation({
      ...params,
      success: false,
      error: params.error,
    });
  }

  getInvocationsByAgent(agentName: string): AgentInvocation[] {
    return this.getInvocations().filter((inv) => inv.agentName === agentName);
  }

  getInvocationsBySession(sessionId: string): AgentInvocation[] {
    return this.getInvocations().filter((inv) => inv.sessionId === sessionId);
  }

  getInvocationsByTimeRange(start: number, end: number): AgentInvocation[] {
    return this.getInvocations().filter(
      (inv) => inv.timestamp >= start && inv.timestamp <= end,
    );
  }

  filterInvocations(filter: AgentMetricsFilter): AgentInvocation[] {
    const invocations = this.getInvocations();
    const names = filter.agentNames;
    const types = filter.agentTypes;
    const levels = filter.complexityLevels;
    const range = filter.timeRange;
    const sessionId = filter.sessionId;
    const hasNames = !!names && names.length > 0;
    const hasTypes = !!types && types.length > 0;
    const hasLevels = !!levels && levels.length > 0;
    const successOnly = !!filter.successOnly;
    const failureOnly = !!filter.failureOnly;
    const hasSession = !!sessionId;

    if (
      !hasNames &&
      !hasTypes &&
      !hasLevels &&
      !range &&
      !successOnly &&
      !failureOnly &&
      !hasSession
    ) {
      return invocations;
    }

    const matched: AgentInvocation[] = [];
    for (const inv of invocations) {
      if (hasNames && names && !names.includes(inv.agentName)) continue;
      if (hasTypes && types && !types.includes(inv.agentType)) continue;
      if (range && (inv.timestamp < range.start || inv.timestamp > range.end)) continue;
      if (hasLevels && levels && !levels.includes(inv.complexityLevel)) continue;
      if (successOnly && !inv.success) continue;
      if (failureOnly && inv.success) continue;
      if (hasSession && inv.sessionId !== sessionId) continue;
      matched.push(inv);
    }
    return matched;
  }

  aggregateMetrics(filter?: AgentMetricsFilter): AggregatedAgentMetrics {
    const invocations = filter ? this.filterInvocations(filter) : this.getInvocations();
    return this.aggregateInvocations(invocations);
  }

  private aggregateInvocations(invocations: AgentInvocation[]): AggregatedAgentMetrics {
    if (invocations.length === 0) {
      return {
        summary: {
          totalInvocations: 0,
          totalAgents: 0,
          timeRange: { start: Date.now(), end: Date.now() },
          overallSuccessRate: 0,
          averageDuration: 0,
        },
        byAgent: {},
        byTimePeriod: {},
        byComplexity: {},
      };
    }

    let totalDuration = 0;
    let successfulCount = 0;
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = Number.NEGATIVE_INFINITY;
    const byAgent = new Map<string, AgentAcc>();
    const byTimePeriod = new Map<string, CountAcc>();
    const byComplexity = new Map<string, CountAcc>();
    const cursor = this.freshPeriodCursor();

    for (const inv of invocations) {
      totalDuration += inv.duration;
      if (inv.success) successfulCount += 1;
      minTs = Math.min(minTs, inv.timestamp);
      maxTs = Math.max(maxTs, inv.timestamp);

      let agentAcc = byAgent.get(inv.agentName);
      if (!agentAcc) {
        agentAcc = this.newAgentAcc();
        byAgent.set(inv.agentName, agentAcc);
      }
      this.addAgent(agentAcc, inv);

      const keys = this.periodKeys(inv, cursor);
      this.addPeriod(byTimePeriod, keys.hour, inv);
      this.addPeriod(byTimePeriod, keys.day, inv);
      this.addPeriod(byTimePeriod, keys.week, inv);
      this.addPeriod(byTimePeriod, keys.month, inv);

      this.addPeriod(byComplexity, inv.complexityLevel, inv);
    }

    const byAgentSummary: Record<string, AgentInvocationSummary> = {};
    for (const [agentName, acc] of byAgent) {
      byAgentSummary[agentName] = this.finishAgent(agentName, acc);
    }

    const byTimeSummary: Record<string, TimePeriodSummary> = {};
    for (const [period, acc] of byTimePeriod) {
      byTimeSummary[period] = {
        period,
        periodType: this.getPeriodType(period),
        ...this.finishCount(acc),
      };
    }

    const byComplexitySummary: Record<string, ComplexitySummary> = {};
    for (const [level, acc] of byComplexity) {
      byComplexitySummary[level] = {
        level: level as ComplexityLevel,
        ...this.finishCount(acc),
      };
    }

    return {
      summary: {
        totalInvocations: invocations.length,
        totalAgents: byAgent.size,
        timeRange: { start: minTs, end: maxTs },
        overallSuccessRate: (successfulCount / invocations.length) * 100,
        averageDuration: totalDuration / invocations.length,
      },
      byAgent: byAgentSummary,
      byTimePeriod: byTimeSummary,
      byComplexity: byComplexitySummary,
    };
  }

  private addPeriod(map: Map<string, CountAcc>, key: string, inv: AgentInvocation): void {
    let acc = map.get(key);
    if (!acc) {
      acc = this.newCountAcc();
      map.set(key, acc);
    }
    this.addCount(acc, inv);
  }

  private freshPeriodCursor(): PeriodCursor {
    return {
      hourCache: new Map(),
      weekCache: new Map(),
      dayStart: Number.NaN,
      dayEnd: Number.NaN,
      week: "",
    };
  }

  // Hour, day, and month stay on UTC ISO. Week keeps the old local Y-M-D label.
  private periodKeys(inv: AgentInvocation, cursor: PeriodCursor): PeriodKeys {
    const cached = periodKeyCache.get(inv);
    if (cached && cached.timestamp === inv.timestamp) return cached;

    const hourId = Math.floor(inv.timestamp / 3600000);
    let parts = cursor.hourCache.get(hourId);
    if (!parts) {
      const iso = new Date(inv.timestamp).toISOString();
      parts = {
        hour: `${iso.slice(0, 13)}:00`,
        day: iso.slice(0, 10),
        month: iso.slice(0, 7),
      };
      cursor.hourCache.set(hourId, parts);
    }

    let week = cursor.week;
    if (!(inv.timestamp >= cursor.dayStart && inv.timestamp < cursor.dayEnd)) {
      const date = new Date(inv.timestamp);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const day = date.getDate();
      const localId = year * 512 + monthIndex * 40 + day;
      const cachedWeek = cursor.weekCache.get(localId);
      if (cachedWeek !== undefined) {
        week = cachedWeek;
      } else {
        const weekNumber = this.weekNumber(year, monthIndex, day);
        week = `${year}-W${weekNumber.toString().padStart(2, "0")}`;
        cursor.weekCache.set(localId, week);
      }
      cursor.week = week;
      cursor.dayStart = new Date(year, monthIndex, day).getTime();
      cursor.dayEnd = new Date(year, monthIndex, day + 1).getTime();
    }

    const stamp: PeriodKeys = {
      timestamp: inv.timestamp,
      hour: parts.hour,
      day: parts.day,
      week,
      month: parts.month,
    };
    periodKeyCache.set(inv, stamp);
    return stamp;
  }

  // Same Thursday-week count as the previous Date.UTC(local Y-M-D) helper.
  private weekNumber(year: number, monthIndex: number, day: number): number {
    const utcMidnight = Date.UTC(year, monthIndex, day);
    const days = Math.floor(utcMidnight / 86400000);
    const dow = (((days + 4) % 7) + 7) % 7;
    const dayNum = dow === 0 ? 7 : dow;
    const shifted = utcMidnight + (4 - dayNum) * 86400000;
    const shiftedYear = new Date(shifted).getUTCFullYear();
    const yearStart = Date.UTC(shiftedYear, 0, 1);
    return Math.ceil(((shifted - yearStart) / 86400000 + 1) / 7);
  }

  private getPeriodType(period: string): "hour" | "day" | "week" | "month" {
    if (period.includes("W")) return "week";
    if (period.length === 7) return "month";
    if (period.length === 10) return "day";
    return "hour";
  }

  private utcStamp(year: number, monthIndex: number, day: number, hour: number): number | null {
    if (monthIndex < 0 || monthIndex > 11 || day < 1 || hour < 0 || hour > 23) return null;
    const stamp = Date.UTC(year, monthIndex, day, hour, 0, 0, 0);
    const date = new Date(stamp);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== monthIndex ||
      date.getUTCDate() !== day ||
      date.getUTCHours() !== hour
    ) {
      return null;
    }
    return stamp;
  }

  private utcPeriodRange(
    period: string,
    periodType: "hour" | "day" | "month",
  ): { start: number; end: number } | null {
    if (periodType === "hour") {
      const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(period);
      const year = this.groupNumber(match, 1);
      const month = this.groupNumber(match, 2);
      const day = this.groupNumber(match, 3);
      const hour = this.groupNumber(match, 4);
      if (year === null || month === null || day === null || hour === null) return null;
      const start = this.utcStamp(year, month - 1, day, hour);
      if (start === null) return null;
      return { start, end: start + 3600000 };
    }

    if (periodType === "day") {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
      const year = this.groupNumber(match, 1);
      const month = this.groupNumber(match, 2);
      const day = this.groupNumber(match, 3);
      if (year === null || month === null || day === null) return null;
      const start = this.utcStamp(year, month - 1, day, 0);
      if (start === null) return null;
      return { start, end: start + 86400000 };
    }

    const match = /^(\d{4})-(\d{2})$/.exec(period);
    const year = this.groupNumber(match, 1);
    const month = this.groupNumber(match, 2);
    if (year === null || month === null) return null;
    const start = this.utcStamp(year, month - 1, 1, 0);
    if (start === null) return null;
    return { start, end: Date.UTC(year, month, 1, 0, 0, 0, 0) };
  }

  private groupNumber(match: RegExpExecArray | null, index: number): number | null {
    if (!match) return null;
    const part = match[index];
    if (part === undefined) return null;
    const value = Number(part);
    if (Number.isNaN(value)) return null;
    return value;
  }

  getAgentSummary(agentName: string): AgentInvocationSummary | null {
    const acc = this.newAgentAcc();
    for (const inv of this.getInvocations()) {
      if (inv.agentName !== agentName) continue;
      this.addAgent(acc, inv);
    }
    if (acc.count === 0) return null;
    return this.finishAgent(agentName, acc);
  }

  getTimePeriodSummary(
    period: string,
    periodType: "hour" | "day" | "week" | "month",
  ): TimePeriodSummary | null {
    const invocations = this.getInvocations();
    const acc = this.newCountAcc();

    if (periodType === "week") {
      const cursor = this.freshPeriodCursor();
      for (const inv of invocations) {
        if (this.periodKeys(inv, cursor).week !== period) continue;
        this.addCount(acc, inv);
      }
    } else if (periodType === "hour" || periodType === "day" || periodType === "month") {
      const range = this.utcPeriodRange(period, periodType);
      if (!range) return null;
      for (const inv of invocations) {
        if (inv.timestamp < range.start || inv.timestamp >= range.end) continue;
        this.addCount(acc, inv);
      }
    } else {
      return null;
    }

    if (acc.count === 0) return null;
    return {
      period,
      periodType,
      ...this.finishCount(acc),
    };
  }

  getComplexitySummary(level: ComplexityLevel): ComplexitySummary | null {
    const acc = this.newCountAcc();
    for (const inv of this.getInvocations()) {
      if (inv.complexityLevel !== level) continue;
      this.addCount(acc, inv);
    }
    if (acc.count === 0) return null;
    return {
      level,
      ...this.finishCount(acc),
    };
  }

  cleanup(olderThanMs?: number, maxEntries?: number): {
    removed: number;
    total: number;
    byAgent: Record<string, number>;
  } {
    const cutoff = olderThanMs ? Date.now() - olderThanMs : 0;
    const limit = maxEntries || this.retentionConfig.maxEntries;
    const invocations = this.getInvocations();
    const byAgent: Record<string, number> = {};
    const beforeCount = invocations.length;
    let next = invocations;

    // Filter by age
    if (cutoff > 0) {
      let removedAny = false;
      for (const inv of invocations) {
        if (inv.timestamp < cutoff) {
          removedAny = true;
          break;
        }
      }
      if (removedAny) {
        const kept: AgentInvocation[] = [];
        for (const inv of invocations) {
          if (inv.timestamp >= cutoff) {
            kept.push(inv);
          } else {
            byAgent[inv.agentName] = (byAgent[inv.agentName] || 0) + 1;
          }
        }
        next = kept;
      }
    }

    // Limit by count
    if (next.length > limit) {
      const drop = next.length - limit;
      let index = 0;
      for (const inv of next) {
        if (index >= drop) break;
        byAgent[inv.agentName] = (byAgent[inv.agentName] || 0) + 1;
        index += 1;
      }
      next = next.slice(drop);
    }

    this.saveInvocations(next);

    return {
      removed: beforeCount - next.length,
      total: next.length,
      byAgent,
    };
  }

  resetMetrics(): void {
    this.saveInvocations([]);
    frameworkLogger.log("agent-metrics", "metrics-reset", "info", {});
  }

  exportMetrics(
    format: "json" | "csv" | "summary" | "detailed" = "json",
    filter?: AgentMetricsFilter,
  ): MetricsExport {
    const invocations = filter ? this.filterInvocations(filter) : this.getInvocations();
    const exportedAt = Date.now();

    const metadata = {
      fromDate: filter?.timeRange?.start,
      toDate: filter?.timeRange?.end,
      filter: filter as Record<string, unknown>,
    };

    switch (format) {
      case "json":
        return {
          format: "json",
          data: invocations,
          exportedAt,
          entryCount: invocations.length,
          metadata,
        };

      case "csv":
        return {
          format: "csv",
          data: this.toCSV(invocations),
          exportedAt,
          entryCount: invocations.length,
          metadata,
        };

      case "summary":
        return {
          format: "summary",
          data: this.aggregateInvocations(invocations),
          exportedAt,
          entryCount: invocations.length,
          metadata,
        };

      case "detailed":
        return {
          format: "detailed",
          data: {
            invocations,
            aggregated: this.aggregateInvocations(invocations),
          },
          exportedAt,
          entryCount: invocations.length,
          metadata,
        };

      default:
        return this.exportMetrics("json", filter);
    }
  }

  private toCSV(invocations: AgentInvocation[]): string {
    const headers = [
      "id",
      "agentName",
      "agentType",
      "timestamp",
      "operation",
      "description",
      "complexityLevel",
      "complexityScore",
      "duration",
      "success",
      "error",
      "sessionId",
      "parentTaskId",
      "inputTokens",
      "outputTokens",
    ];

    const rows = [headers.join(",")];

    for (const inv of invocations) {
      const row = [
        inv.id,
        inv.agentName,
        inv.agentType,
        inv.timestamp,
        this.escapeCSV(inv.operation),
        this.escapeCSV(inv.description),
        inv.complexityLevel,
        inv.complexityScore,
        inv.duration,
        inv.success,
        this.escapeCSV(inv.error || ""),
        this.escapeCSV(inv.sessionId || ""),
        this.escapeCSV(inv.parentTaskId || ""),
        inv.inputTokens ?? "",
        inv.outputTokens ?? "",
      ];
      rows.push(row.join(","));
    }

    return rows.join("\n");
  }

  private escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  getStatistics(): {
    totalInvocations: number;
    uniqueAgents: number;
    oldestInvocation: number | null;
    newestInvocation: number | null;
    successRate: number;
    averageDuration: number;
    topAgents: Array<{ name: string; count: number }>;
  } {
    const invocations = this.getInvocations();

    if (invocations.length === 0) {
      return {
        totalInvocations: 0,
        uniqueAgents: 0,
        oldestInvocation: null,
        newestInvocation: null,
        successRate: 0,
        averageDuration: 0,
        topAgents: [],
      };
    }

    let successful = 0;
    let totalDuration = 0;
    let oldest = Number.POSITIVE_INFINITY;
    let newest = Number.NEGATIVE_INFINITY;
    const unique = new Set<string>();
    const agentCounts: Record<string, number> = {};

    for (const inv of invocations) {
      totalDuration += inv.duration;
      if (inv.success) successful += 1;
      oldest = Math.min(oldest, inv.timestamp);
      newest = Math.max(newest, inv.timestamp);
      unique.add(inv.agentName);
      agentCounts[inv.agentName] = (agentCounts[inv.agentName] || 0) + 1;
    }

    const topAgents = Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalInvocations: invocations.length,
      uniqueAgents: unique.size,
      oldestInvocation: oldest,
      newestInvocation: newest,
      successRate: (successful / invocations.length) * 100,
      averageDuration: totalDuration / invocations.length,
      topAgents,
    };
  }

  updateRetentionConfig(config: Partial<MetricsRetentionConfig>): void {
    this.retentionConfig = { ...this.retentionConfig, ...config };

    if (this.retentionConfig.enableAutoCleanup) {
      this.startAutoCleanup();
    } else {
      const interval = this.cleanupInterval;
      if (interval) {
        clearInterval(interval);
        this.cleanupInterval = undefined as unknown as NodeJS.Timeout;
      }
    }

    frameworkLogger.log("agent-metrics", "retention-updated", "info", config);
  }

  destroy(): void {
    const interval = this.cleanupInterval;
    if (interval) {
      clearInterval(interval);
      this.cleanupInterval = undefined as unknown as NodeJS.Timeout;
    }
    this.initialized = false;
  }
}

let globalMetricsSystem: AgentMetricsSystem | null = null;

export function getAgentMetricsSystem(stateManager?: XrayStateManager): AgentMetricsSystem {
  if (!globalMetricsSystem && stateManager) {
    globalMetricsSystem = new AgentMetricsSystem(stateManager);
  }
  return globalMetricsSystem!;
}

export function initializeAgentMetrics(stateManager: XrayStateManager): AgentMetricsSystem {
  globalMetricsSystem = new AgentMetricsSystem(stateManager);
  return globalMetricsSystem;
}

export function resetAgentMetricsSystem(): void {
  if (globalMetricsSystem) {
    globalMetricsSystem.destroy();
    globalMetricsSystem = null;
  }
}
