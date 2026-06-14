/**
 * Session Capture Processor
 *
 * Extracted from InferenceImprovementProcessor - handles discovery of
 * session data sources (reflections, logs, reports) for inference workflows.
 *
 * @module processors/implementations
 */

import * as fs from "fs";
import * as path from "path";

export class SessionCapture {
  static findReflections(directory: string, reflectionsDir: string): string[] {
    const reflectionsPath = path.join(directory, reflectionsDir);
    if (!fs.existsSync(reflectionsPath)) return [];

    return fs.readdirSync(reflectionsPath)
      .filter(f => f.endsWith(".md"))
      .map(f => path.join(reflectionsPath, f));
  }

  static findLogs(directory: string, logsDir: string): string[] {
    const logsPath = path.join(directory, logsDir);
    if (!fs.existsSync(logsPath)) return [];

    return fs.readdirSync(logsPath)
      .filter(f => f.includes("routing") || f.includes("activity") || f.includes("session"))
      .map(f => path.join(logsPath, f));
  }

  static findReports(directory: string, reportsDir: string): string[] {
    const reportsPath = path.join(directory, reportsDir);
    if (!fs.existsSync(reportsPath)) return [];

    return fs.readdirSync(reportsPath)
      .filter(f => f.endsWith(".json") || f.endsWith(".md"))
      .map(f => path.join(reportsPath, f));
  }
}

export default SessionCapture;
