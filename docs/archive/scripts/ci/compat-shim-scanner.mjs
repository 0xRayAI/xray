#!/usr/bin/env node
/**
 * compat-shim-scanner.mjs — Term 78: Compat Shim Removal in Same Release Cycle.
 *
 * Scans the source tree for known compat shim patterns and reports any that
 * exist without their modern counterpart. Designed to run in CI as a pre-PR
 * check via enforce-validators.mjs or standalone.
 *
 * Patterns detected:
 *   - `||` fallback with known legacy name (e.g. XrayStateManager)
 *   - exported symbols suffixed `Compat`, `Legacy`, `Shim`, `Fallback`
 *   - `@deprecated` JSDoc on exported functions/classes
 *   - Known compat variables/imports from the old `0xray` package name
 *
 * Usage:
 *   node scripts/ci/compat-shim-scanner.mjs
 *   node scripts/ci/compat-shim-scanner.mjs --verbose
 *   node scripts/ci/compat-shim-scanner.mjs --fix    # not implemented
 */

import { readFileSync, existsSync } from "node:fs";
import pkg from "glob";
const globSync = pkg.sync;

const verbose = process.argv.includes("--verbose");
const log = verbose ? (...args) => console.error("[compat-shim]", ...args) : () => {};
let exitCode = 0;

const report = [];

/**
 * Check a single file for compat shim patterns.
 */
function scanFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings = [];

  // Pattern 1: || fallback with known legacy name
  const legacyNames = [
    "XrayStateManager", "Xray",
    "0xRay", "stringray",
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const legacy of legacyNames) {
      if (line.includes(legacy) && line.includes("||")) {
        findings.push({
          line: i + 1,
          pattern: "legacy-fallback",
          legacy,
          text: line.trim(),
        });
      }
    }
  }

  // Pattern 2: exported symbols suffixed Compat/Legacy/Shim/Fallback
  const compatSuffixRe = /export\s+(function|const|class|interface|type|default\s+function)\s+(\w*)(Compat|Legacy|Shim|Fallback)\b/;
  const compatMatch = content.match(compatSuffixRe);
  if (compatMatch) {
    const lineNum = lines.findIndex((l) => l.includes(compatMatch[0])) + 1;
    findings.push({
      line: lineNum,
      pattern: "compat-export-suffix",
      symbol: compatMatch[0],
      text: compatMatch[0].trim(),
    });
  }

  // Pattern 3: @deprecated JSDoc on exported symbols
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("@deprecated")) {
      // Look ahead for an export
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes("export ") || lines[j].includes("export default ")) {
          findings.push({
            line: i + 1,
            pattern: "deprecated-export",
            text: lines[j].trim(),
            deprecatedLine: line.trim(),
          });
          break;
        }
      }
    }
  }

  // Pattern 4: Known compat variable names
  const compatNames = [
    "XrayStateManager", "XrayClient",
    "LEGACY_", "COMPAT_",
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const name of compatNames) {
      if (line.includes(name) && (line.includes("import ") || line.includes("require(") || line.includes("const ") || line.includes("let ") || line.includes("var "))) {
        findings.push({
          line: i + 1,
          pattern: "compat-import-or-decl",
          name,
          text: line.trim(),
        });
      }
    }
  }

  return findings;
}

function main() {
  const srcFiles = globSync("src/**/*.{ts,mjs}", { ignore: ["src/**/__tests__/**", "src/**/*.d.ts"] });

  for (const file of srcFiles) {
    const findings = scanFile(file);
    for (const f of findings) {
      report.push({ file, ...f });
    }
  }

  // Output
  if (report.length === 0) {
    console.log("✅ No compat shim patterns found — Term 78 clean");
    return;
  }

  console.log(`\nFound ${report.length} compat shim reference(s):\n`);
  for (const r of report) {
    console.log(`  ${r.file}:${r.line} [${r.pattern}]`);
    console.log(`    ${r.text}`);
    if (r.legacy) console.log(`    Legacy name: ${r.legacy}`);
    if (r.symbol) console.log(`    Symbol: ${r.symbol}`);
    console.log();
  }

  // Active shims that should be tracked (non-test, non-deprecated-export-doc)
  const activeShims = report.filter(
    (r) => r.pattern !== "deprecated-export",
  );

  if (activeShims.length > 0) {
    console.log(`⚠️  ${activeShims.length} active compat shim(s) — review for removal (Term 78):\n`);
    for (const r of activeShims) {
      console.log(`  - ${r.file}:${r.line} ${r.text}`);
    }
    console.log();
    console.log("  Term 78 requires compat shims be removed in the same release cycle.");
    console.log("  These are informational for now — not blocking CI.");
  }

  // Non-zero exit if there are real compat-export-suffix patterns (actual compat wrappers)
  const compatExports = report.filter((r) => r.pattern === "compat-export-suffix" || r.pattern === "compat-import-or-decl");
  if (compatExports.length > 0) {
    console.log(`❌ ${compatExports.length} compat export/import declaration(s) found — these should be removed:`);
    for (const r of compatExports) {
      console.log(`  - ${r.file}:${r.line} ${r.text}`);
    }
    exitCode = 1;
  }
}

try {
  main();
  process.exit(exitCode);
} catch (err) {
  console.error("❌ compat-shim-scanner failed:", err.message);
  process.exit(1);
}
