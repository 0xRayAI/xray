import { type ParsedLogEntry, type ReportConfig } from "./types.js";
export declare function levelToStatus(level: string): string;
export declare function inferAgent(component: string): string;
export declare function parseLogLine(line: string): ParsedLogEntry | null;
export declare function frameworkLogToParsedEntry(entry: import("../core/framework-logger.js").FrameworkLogEntry): ParsedLogEntry;
export declare function readCurrentLogFile(timeRange?: ReportConfig["timeRange"]): Promise<ParsedLogEntry[]>;
export declare function parseCompressedLogFile(filePath: string, startTime: number, endTime: number): Promise<ParsedLogEntry[]>;
export declare function readRotatedLogFiles(timeRange?: ReportConfig["timeRange"]): Promise<ParsedLogEntry[]>;
export declare function getComprehensiveLogs(config: ReportConfig): Promise<ParsedLogEntry[]>;
export declare function filterLogsByConfig(logs: ParsedLogEntry[], config: ReportConfig): ParsedLogEntry[];
//# sourceMappingURL=log-parser.d.ts.map