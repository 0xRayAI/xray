/**
 * Where the suit writes. One home, under .xray.
 * Readers still open the old path when the new file is not there yet.
 */
const { existsSync } = require("fs");
const { join } = require("path");

function logsDir(root) {
  return join(root, ".xray", "logs");
}

function activityLog(root) {
  return join(logsDir(root), "activity.log");
}

function inferenceDir(root) {
  return join(root, ".xray", "inference");
}

function latestSession(root) {
  return join(inferenceDir(root), "latest-session.json");
}

function activityLogForRead(root) {
  const next = activityLog(root);
  const prev = join(root, "logs", "framework", "activity.log");
  if (existsSync(next) || !existsSync(prev)) return next;
  return prev;
}

function latestSessionForRead(root) {
  const next = latestSession(root);
  const prev = join(root, "docs", "inference", "latest-session.json");
  if (existsSync(next) || !existsSync(prev)) return next;
  return prev;
}

/** Old feature values that used to scatter writes. */
function isLegacyLogPath(logPath) {
  if (!logPath) return true;
  const normalized = String(logPath).replace(/\\/g, "/").replace(/\/$/, "");
  return (
    normalized === ".opencode/logs" ||
    normalized === ".opencode" ||
    normalized === "logs" ||
    normalized === "logs/framework" ||
    normalized.endsWith("/logs/framework")
  );
}

module.exports = {
  logsDir,
  activityLog,
  inferenceDir,
  latestSession,
  activityLogForRead,
  latestSessionForRead,
  isLegacyLogPath,
};
