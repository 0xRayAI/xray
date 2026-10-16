/**
 * Structured logger inspired by xray frameworkLogger (no console.* in library paths).
 */

const LEVELS = new Set(["debug", "info", "warn", "error"]);

/**
 * @param {string} module
 * @param {string} event
 * @param {"debug"|"info"|"warn"|"error"} level
 * @param {Record<string, unknown>} [details]
 */
export function log(module, event, level, details = {}) {
  if (!LEVELS.has(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }
  const payload = {
    ts: new Date().toISOString(),
    module,
    event,
    level,
    ...details,
  };
  const line = JSON.stringify(payload);
  process.stderr.write(`${line}\n`);
}
