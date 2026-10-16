/**
 * Codex pattern rows (terms 1–12) — derived from xray/xray/codex.json slices.
 * Format: [id, termNumber, severity, RegExp, message]
 */

export const PATTERN_ROWS_TERMS_01_12 = [
  ["term-01-no-todo", 1, "blocking", /\b(TODO|FIXME|HACK|XXX|STUB)\b/i, "Term 1: no placeholder markers in production paths"],
  ["term-01-not-implemented", 1, "blocking", /throw new Error\(['"]Not implemented/i, "Term 1: incomplete implementation throw"],
  ["term-02-bridge-comment", 2, "blocking", /\/\/\s*bridge\s*code/i, "Term 2: bridge code comment"],
  ["term-02-temporary-patch", 2, "blocking", /\/\/\s*temporary/i, "Term 2: temporary patch comment"],
  ["term-03-god-class", 3, "medium", /class\s+\w{20,}/, "Term 3: suspiciously large class name — review over-engineering"],
  ["term-07-empty-catch", 7, "blocking", /catch\s*\([^)]*\)\s*\{\s*\}/, "Term 7: empty catch swallows errors"],
  ["term-08-while-true", 8, "blocking", /while\s*\(\s*true\s*\)/, "Term 8: unbounded while(true) requires exit strategy"],
  ["term-29-eval", 29, "blocking", /\beval\s*\(/, "Term 29: eval forbidden"],
  ["term-29-function-constructor", 29, "blocking", /new\s+Function\s*\(/, "Term 29: Function constructor forbidden"],
  ["term-32-ignored-promise", 32, "high", /\.then\(\s*\)/, "Term 32: floating promise without handler"],
  ["term-46-require-mixed", 46, "blocking", /\brequire\s*\(/, "Term 46: CommonJS require in ESM-first bench app"],
  ["term-47-module-exports", 47, "blocking", /module\.exports\s*=/, "Term 47: CommonJS export in ESM app"],
  ["term-52-spawn-bypass", 52, "blocking", /spawnSubagentWithoutGovernor/, "Term 52: spawn must pass governor"],
  ["term-69-new-server-file", 69, "blocking", /\/mcps\/.*\.server\.(ts|js)/, "Term 69: new MCP server surface"],
];

// APPEND_MARKER
