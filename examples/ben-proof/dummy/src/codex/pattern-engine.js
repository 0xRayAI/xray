/**
 * Static pattern engine for codex-derived heuristics (bench app).
 */

/** @typedef {[string, number, string, RegExp, string]} PatternRow */

/**
 * @param {PatternRow[]} rows
 * @param {string} source
 */
export function scanSourceWithRows(rows, source) {
  const violations = [];
  if (typeof source !== "string" || source.length === 0) {
    return { ok: true, violations, scannedBytes: 0 };
  }
  for (const row of rows) {
    const [id, term, severity, regex, message] = row;
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      violations.push({
        id,
        termNumber: term,
        severity,
        message,
        index: match.index,
        excerpt: source.slice(Math.max(0, match.index - 20), match.index + 40),
      });
      if (!regex.global) break;
    }
  }
  return {
    ok: violations.length === 0,
    violations,
    scannedBytes: source.length,
  };
}

/**
 * @param {PatternRow[]} rows
 * @param {Record<string, string>} files
 */
export function scanFileMap(rows, files) {
  const byFile = {};
  let totalViolations = 0;
  for (const [path, content] of Object.entries(files)) {
    const result = scanSourceWithRows(rows, content);
    if (result.violations.length > 0) {
      byFile[path] = result.violations;
      totalViolations += result.violations.length;
    }
  }
  return { ok: totalViolations === 0, byFile, totalViolations };
}

export function mergePatternRows(...groups) {
  return groups.flat();
}

export function filterRowsByTerm(rows, termNumber) {
  return rows.filter((row) => row[1] === termNumber);
}

export function filterRowsBySeverity(rows, severity) {
  return rows.filter((row) => row[2] === severity);
}
