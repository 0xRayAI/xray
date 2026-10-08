import * as fs from "fs";
import * as path from "path";
import { createGunzip } from "zlib";
import { fileURLToPath } from "node:url";
import { frameworkLogger } from "../core/framework-logger.js";
import { type ParsedLogEntry, type ReportConfig } from "./types.js";

const LOG_LINE_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+?)\s+-\s+(\w+)$/;
const LOG_LINE_FALLBACK_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+(.+?)\s+-\s+(\w+)$/;

type ParsedFileCache = {
  mtimeMs: number;
  size: number;
  entries: ParsedLogEntry[];
};

// Parsed rows stay cached while size and mtime stay the same.
let currentLogCache: ParsedFileCache | null = null;
const rotatedLogCache = new Map<string, ParsedFileCache>();

export function levelToStatus(level: string): string {
  switch (level.toUpperCase()) {
    case "ERROR":
      return "error";
    case "WARN":
    case "WARNING":
      return "warning";
    case "INFO":
      return "success";
    case "DEBUG":
      return "info";
    default:
      return "info";
  }
}

export function inferAgent(component: string): string {
  if (component.includes("enforcer")) return "enforcer";
  if (component.includes("architect")) return "architect";
  if (component.includes("orchestrator")) return "orchestrator";
  if (component.includes("bug-triage")) return "bug-triage-specialist";
  if (component.includes("code-review")) return "code-reviewer";
  if (component.includes("security-audit")) return "security-auditor";
  if (component.includes("refactor")) return "refactorer";
  if (component.includes("testing-lead")) return "testing-lead";
  return "system";
}

export function parseLogLine(line: string): ParsedLogEntry | null {
  const match = line.match(LOG_LINE_RE);

  if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
    const timestamp = match[1];
    const jobId = match[2];
    const component = match[3];
    const message = match[4];
    const level = match[5];

    const action = message.includes(":")
      ? (message.split(":")[0] || "").trim()
      : message.trim();

    const status = levelToStatus(level);

    return {
      timestamp: new Date(timestamp).getTime(),
      jobId: jobId.trim(),
      component: component.trim(),
      action,
      message: message.trim(),
      level: level.toLowerCase(),
      status,
      agent: inferAgent(component),
    };
  }

  const fallbackMatch = line.match(LOG_LINE_FALLBACK_RE);

  if (
    fallbackMatch &&
    fallbackMatch[1] &&
    fallbackMatch[2] &&
    fallbackMatch[3] &&
    fallbackMatch[4]
  ) {
    const timestamp = fallbackMatch[1];
    const component = fallbackMatch[2];
    const message = fallbackMatch[3];
    const level = fallbackMatch[4];

    const action = message.includes(":")
      ? (message.split(":")[0] || "").trim()
      : message.trim();

    const status = levelToStatus(level);

    return {
      timestamp: new Date(timestamp).getTime(),
      jobId: null,
      component: component.trim(),
      action,
      message: message.trim(),
      level: level.toLowerCase(),
      status,
      agent: inferAgent(component),
    };
  }

  return null;
}

export function frameworkLogToParsedEntry(
  entry: import("../core/framework-logger.js").FrameworkLogEntry,
): ParsedLogEntry {
  return {
    timestamp: entry.timestamp,
    component: entry.component,
    action: entry.action,
    message: entry.action,
    level: entry.status,
    status: entry.status,
    agent: entry.agent,
    jobId: entry.jobId ?? null,
    sessionId: entry.sessionId,
    details: entry.details as Record<string, unknown> | undefined,
  };
}

function parseLogContent(content: string): ParsedLogEntry[] {
  const logs: ParsedLogEntry[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const logEntry = parseLogLine(line);
      if (logEntry) logs.push(logEntry);
    } catch {
      // Continue processing other lines
    }
  }
  return logs;
}

function windowOf(timeRange?: ReportConfig["timeRange"]): {
  startTime: number;
  endTime: number;
} {
  const startTime =
    timeRange?.start?.getTime() ??
    (timeRange?.lastHours
      ? Date.now() - timeRange.lastHours * 60 * 60 * 1000
      : 0);
  const endTime = timeRange?.end?.getTime() ?? Date.now();
  return { startTime, endTime };
}

function withinWindow(
  logs: ParsedLogEntry[],
  startTime: number,
  endTime: number,
): ParsedLogEntry[] {
  const filtered: ParsedLogEntry[] = [];
  for (const log of logs) {
    if (log.timestamp >= startTime && log.timestamp <= endTime) {
      filtered.push(log);
    }
  }
  return filtered;
}

// Length prefixes keep the first timestamp + component + action row.
function eventKey(log: ParsedLogEntry): string {
  const component = log.component;
  const action = log.action;
  return `${log.timestamp}\0${component.length}\0${component}\0${action.length}\0${action}`;
}

function uniqueSorted(logs: ParsedLogEntry[]): ParsedLogEntry[] {
  const seen = new Set<string>();
  const unique: ParsedLogEntry[] = [];
  for (const log of logs) {
    const key = eventKey(log);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(log);
  }
  unique.sort((a, b) => a.timestamp - b.timestamp);
  return unique;
}

export async function readCurrentLogFile(
  timeRange?: ReportConfig["timeRange"],
): Promise<ParsedLogEntry[]> {
  const currentFilePath = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFilePath), "../../");
  const logFile = path.join(projectRoot, "logs", "framework", "activity.log");

  try {
    if (!fs.existsSync(logFile)) {
      currentLogCache = null;
      return [];
    }

    const before = fs.statSync(logFile);
    let entries: ParsedLogEntry[];
    const hit = currentLogCache;
    if (hit && hit.mtimeMs === before.mtimeMs && hit.size === before.size) {
      entries = hit.entries;
    } else {
      const content = fs.readFileSync(logFile, "utf8");
      const after = fs.statSync(logFile);
      const parsed = parseLogContent(content);
      if (before.mtimeMs === after.mtimeMs && before.size === after.size) {
        currentLogCache = {
          mtimeMs: after.mtimeMs,
          size: after.size,
          entries: parsed,
        };
      } else {
        currentLogCache = null;
      }
      entries = parsed;
    }

    const { startTime, endTime } = windowOf(timeRange);
    return withinWindow(entries, startTime, endTime);
  } catch (error) {
    await frameworkLogger.log(
      "framework-reporting-system",
      "current-log-read-failed",
      "warning",
      { error: String(error) },
    );
  }

  return [];
}

export async function parseCompressedLogFile(
  filePath: string,
  startTime: number,
  endTime: number,
): Promise<ParsedLogEntry[]> {
  return new Promise((resolve, reject) => {
    const logs: ParsedLogEntry[] = [];
    let buffer = "";

    try {
      const readStream = fs.createReadStream(filePath);
      readStream
        .pipe(createGunzip())
        .on("data", (chunk: Buffer) => {
          buffer += chunk.toString();

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const logEntry = parseLogLine(line);
                if (
                  logEntry &&
                  logEntry.timestamp >= startTime &&
                  logEntry.timestamp <= endTime
                ) {
                  logs.push(logEntry);
                }
              } catch {
                // Skip malformed lines
              }
            }
          }
        })
        .on("end", () => resolve(logs))
        .on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

async function cachedRotatedEntries(filePath: string): Promise<ParsedLogEntry[]> {
  const before = fs.statSync(filePath);
  const hit = rotatedLogCache.get(filePath);
  if (hit && hit.mtimeMs === before.mtimeMs && hit.size === before.size) {
    return hit.entries;
  }

  const entries = await parseCompressedLogFile(
    filePath,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  const after = fs.statSync(filePath);
  if (before.mtimeMs === after.mtimeMs && before.size === after.size) {
    rotatedLogCache.set(filePath, {
      mtimeMs: after.mtimeMs,
      size: after.size,
      entries,
    });
  } else {
    rotatedLogCache.delete(filePath);
  }
  return entries;
}

export async function readRotatedLogFiles(
  timeRange?: ReportConfig["timeRange"],
): Promise<ParsedLogEntry[]> {
  const logs: ParsedLogEntry[] = [];
  const logDir = path.join(process.cwd(), "logs", "framework");

  if (!fs.existsSync(logDir)) return logs;

  try {
    const files = fs
      .readdirSync(logDir)
      .filter(
        (file) =>
          file.startsWith("framework-activity-") && file.endsWith(".log.gz"),
      )
      .sort()
      .reverse();

    const keep = new Set(
      files.slice(0, 3).map((file) => path.join(logDir, file)),
    );
    for (const key of rotatedLogCache.keys()) {
      if (!keep.has(key)) rotatedLogCache.delete(key);
    }

    const { startTime, endTime } = windowOf(timeRange);

    for (const file of files.slice(0, 3)) {
      const filePath = path.join(logDir, file);
      try {
        const fileLogs = withinWindow(
          await cachedRotatedEntries(filePath),
          startTime,
          endTime,
        );
        for (const entry of fileLogs) logs.push(entry);

        if (logs.length > 5000) break;
      } catch (error) {
        await frameworkLogger.log(
          "framework-reporting-system",
          "rotated-log-parse-failed",
          "warning",
          { file, error: String(error) },
        );
      }
    }
  } catch (error) {
    await frameworkLogger.log(
      "framework-reporting-system",
      "rotated-logs-read-failed",
      "warning",
      { error: String(error) },
    );
  }

  return logs;
}

export async function getComprehensiveLogs(
  config: ReportConfig,
): Promise<ParsedLogEntry[]> {
  const allLogs: ParsedLogEntry[] = [];
  const recentLogs = frameworkLogger.getRecentLogs(1000);
  for (const entry of recentLogs) {
    allLogs.push(frameworkLogToParsedEntry(entry));
  }

  try {
    const currentLogs = await readCurrentLogFile(config.timeRange);
    for (const entry of currentLogs) allLogs.push(entry);
  } catch (error) {
    await frameworkLogger.log(
      "framework-reporting-system",
      "current-log-read-failed",
      "warning",
      { error: String(error) },
    );
  }

  if (
    config.timeRange &&
    ((config.timeRange.lastHours && config.timeRange.lastHours > 24) ||
      (config.timeRange.start &&
        config.timeRange.end &&
        config.timeRange.end.getTime() - config.timeRange.start.getTime() >
          24 * 60 * 60 * 1000))
  ) {
    try {
      const rotatedLogs = await readRotatedLogFiles(config.timeRange);
      for (const entry of rotatedLogs) allLogs.push(entry);
    } catch (error) {
      await frameworkLogger.log(
        "framework-reporting-system",
        "rotated-logs-read-failed",
        "warning",
        { error: String(error) },
      );
    }
  }

  return uniqueSorted(allLogs);
}

function matchesReportType(
  log: ParsedLogEntry,
  type: ReportConfig["type"],
): boolean {
  switch (type) {
    case "orchestration":
      return (
        log.component === "agent-delegator" ||
        log.action.includes("delegation")
      );
    case "agent-usage":
      return Boolean(log.agent) || log.component.includes("agent");
    case "context-awareness":
      return (
        log.component.includes("context") || log.component.includes("ast")
      );
    case "performance":
      return (
        log.action.includes("complete") || log.action.includes("failed")
      );
    default:
      return true;
  }
}

export function filterLogsByConfig(
  logs: ParsedLogEntry[],
  config: ReportConfig,
): ParsedLogEntry[] {
  const sessionId = config.sessionId;
  const jobId = config.jobId;
  let startTime = 0;
  let endTime = 0;
  const hasTime = Boolean(config.timeRange);
  if (config.timeRange) {
    const window = windowOf(config.timeRange);
    startTime = window.startTime;
    endTime = window.endTime;
  }

  const filtered: ParsedLogEntry[] = [];
  for (const log of logs) {
    if (sessionId && log.sessionId !== sessionId) continue;
    if (jobId && log.jobId !== jobId) continue;
    if (hasTime && (log.timestamp < startTime || log.timestamp > endTime)) {
      continue;
    }
    if (!matchesReportType(log, config.type)) continue;
    filtered.push(log);
  }
  return filtered;
}
