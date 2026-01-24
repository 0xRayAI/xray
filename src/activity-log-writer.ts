// Activity Log Writer - Integrates with job correlation
// This module writes to the activity log with job ID correlation

import { promises as fs } from 'fs';
import { getCurrentJobId } from './framework-logger.js';

export interface ActivityLogEntry {
  timestamp: string;
  component: string;
  event: string;
  status: string;
  jobId?: string;
  sessionId?: string;
  data?: any;
}

/**
 * Write an entry to the activity log with job correlation
 */
export async function writeActivityLog(entry: ActivityLogEntry): Promise<void> {
  try {
    // Ensure job ID is included from global context if not provided
    const jobId = entry.jobId || getCurrentJobId() || 'no-job';

    // Format log entry with job ID correlation
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${jobId}] [${entry.component}] ${entry.event} - ${entry.status}`;

    // Write to activity log file
    const logDir = './logs/framework/';
    const logFile = logDir + 'activity.log';

    // Ensure directory exists
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }

    // Append log entry
    await fs.appendFile(logFile, logLine + '\n', 'utf8');

  } catch (error) {
    console.error('Failed to write activity log:', error);
    // Fallback to console if file write fails
    console.log(`[ACTIVITY-LOG-ERROR] Failed to write: ${error}`);
  }
}