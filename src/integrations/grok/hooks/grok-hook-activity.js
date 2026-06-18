#!/usr/bin/env node
/**
 * Sync activity.log writer for Grok hooks (hooks exit before frameworkLogger flush).
 * Format matches frameworkLogger.bufferEntry output.
 */

import fs from 'fs';
import path from 'path';

function formatLine(component, action, status, details, jobId) {
  const ts = new Date().toISOString();
  const jobPart = jobId ? `[${jobId}] ` : '';
  const detailsPart = details
    ? ` | ${(() => {
        try {
          return JSON.stringify(details);
        } catch {
          return String(details);
        }
      })()}`
    : '';
  return `${ts} ${jobPart}[${component}] ${action} - ${status.toUpperCase()}${detailsPart}\n`;
}

export function appendHookActivity(root, component, action, status, details = {}) {
  const workspace = root || process.cwd();
  const logDir = path.join(workspace, 'logs', 'framework');
  const logFile = path.join(logDir, 'activity.log');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const jobId = `hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    fs.appendFileSync(logFile, formatLine(component, action, status, details, jobId));
    return jobId;
  } catch {
    return null;
  }
}

export function activityLogHasPattern(root, pattern, tailBytes = 65536) {
  const logFile = path.join(root, 'logs', 'framework', 'activity.log');
  if (!fs.existsSync(logFile)) return false;
  try {
    const stat = fs.statSync(logFile);
    const start = Math.max(0, stat.size - tailBytes);
    const fd = fs.openSync(logFile, 'r');
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return pattern.test(buf.toString('utf8'));
  } catch {
    return false;
  }
}