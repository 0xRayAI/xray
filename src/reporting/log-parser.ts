import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
import { type ParsedLogEntry, type ReportConfig } from "./types.js";

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
  const logRegex =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+?)\s+-\s+(\w+)$/;
  const match = line.match(logRegex);

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

  const fallbackRegex =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+(.+?)\s+-\s+(\w+)$/;
  const fallbackMatch = line.match(fallbackRegex);

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

export async function readCurrentLogFile(
  timeRange?: ReportConfig["timeRange"],
): Promise<ParsedLogEntry[]> {
  const logs: ParsedLogEntry[] = [];

  const currentFileUrl = import.meta.url;
  const currentFilePath = new URL(currentFileUrl).pathname;
  const projectRoot = path.resolve(path.dirname(currentFilePath), "../../");
  const logDir = path.join(projectRoot, "logs", "framework");
  const logFile = path.join(logDir, "activity.log");

  try {
    const fsModule = await import("fs");

    if (!fsModule.existsSync(logFile)) {
      return logs;
    }

    const content = fsModule.readFileSync(logFile, "utf8");
    const lines = content.split("\n");

    const startTime =
      timeRange?.start?.getTime() ??
      (timeRange?.lastHours
        ? Date.now() - timeRange.lastHours * 60 * 60 * 1000
        : 0);
    const endTime = timeRange?.end?.getTime() ?? Date.now();

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
          // Continue processing other lines
        }
      }
    }
  } catch (error) {
    await frameworkLogger.log(
      "framework-reporting-system",
      "current-log-read-failed",
      "warning",
      { error: String(error) },
    );
  }

  return logs;
}

export async function parseCompressedLogFile(
  filePath: string,
  startTime: number,
  endTime: number,
): Promise<ParsedLogEntry[]> {
  return new Promise((resolve, reject) => {
    const logs: ParsedLogEntry[] = [];

    (async () => {
      try {
        const zlib = await import("zlib");
        const fsModule = await import("fs");

        const readStream = fsModule.createReadStream(filePath);
        const gunzip = zlib.createGunzip();
        let buffer = "";

        readStream
          .pipe(gunzip)
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
    })();
  });
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

    const startTime =
      timeRange?.start?.getTime() ??
      (timeRange?.lastHours
        ? Date.now() - timeRange.lastHours * 60 * 60 * 1000
        : 0);
    const endTime = timeRange?.end?.getTime() ?? Date.now();

    for (const file of files.slice(0, 3)) {
      try {
        const fileLogs = await parseCompressedLogFile(
          path.join(logDir, file),
          startTime,
          endTime,
        );
        logs.push(...fileLogs);

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
  const recentLogs = frameworkLogger.getRecentLogs(1000);

  const convertedRecent = recentLogs.map(frameworkLogToParsedEntry);

  let allLogs: ParsedLogEntry[] = [...convertedRecent];
  try {
    const currentLogs = await readCurrentLogFile(config.timeRange);
    allLogs = [...allLogs, ...currentLogs];
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
      allLogs = [...allLogs, ...rotatedLogs];
    } catch (error) {
      await frameworkLogger.log(
        "framework-reporting-system",
        "rotated-logs-read-failed",
        "warning",
        { error: String(error) },
      );
    }
  }

  const uniqueLogs = allLogs.filter(
    (log, index, self) =>
      index ===
      self.findIndex(
        (l) =>
          l.timestamp === log.timestamp &&
          l.component === log.component &&
          l.action === log.action,
      ),
  );

  return uniqueLogs.sort((a, b) => a.timestamp - b.timestamp);
}

export function filterLogsByConfig(
  logs: ParsedLogEntry[],
  config: ReportConfig,
): ParsedLogEntry[] {
  let filtered = logs;

  if (config.sessionId) {
    filtered = filtered.filter((log) => log.sessionId === config.sessionId);
  }

  if (config.jobId) {
    filtered = filtered.filter((log) => log.jobId === config.jobId);
  }

  if (config.timeRange) {
    const startTime =
      config.timeRange.start?.getTime() ??
      (config.timeRange.lastHours
        ? Date.now() - config.timeRange.lastHours * 60 * 60 * 1000
        : 0);
    const endTime = config.timeRange.end?.getTime() ?? Date.now();

    filtered = filtered.filter(
      (log) => log.timestamp >= startTime && log.timestamp <= endTime,
    );
  }

  switch (config.type) {
    case "orchestration":
      filtered = filtered.filter(
        (log) =>
          log.component === "agent-delegator" ||
          log.action.includes("delegation"),
      );
      break;
    case "agent-usage":
      filtered = filtered.filter(
        (log) => log.agent || log.component.includes("agent"),
      );
      break;
    case "context-awareness":
      filtered = filtered.filter(
        (log) =>
          log.component.includes("context") || log.component.includes("ast"),
      );
      break;
    case "performance":
      filtered = filtered.filter(
        (log) =>
          log.action.includes("complete") || log.action.includes("failed"),
      );
      break;
  }

  return filtered;
}