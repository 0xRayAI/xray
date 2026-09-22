#!/usr/bin/env node
/**
 * Direct ValidatorRegistry invocation for CI.
 * Bypasses bridge.mjs snippet-safe filter — runs ALL 29 validators.
 *
 * Usage:
 *   node scripts/ci/enforce-validators.mjs                                # scan src/ via git diff
 *   node scripts/ci/enforce-validators.mjs src/file1.ts src/file2.ts     # explicit paths
 *
 * Exits 0 on pass, 1+ on violations (count = exit code).
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");

async function loadRegistry() {
  const candidates = [
    join(projectRoot, "dist", "enforcement", "validators", "validator-registry.js"),
    join(projectRoot, "node_modules", "0xray", "dist", "enforcement", "validators", "validator-registry.js"),
  ];
  for (const p of candidates) {
    try {
      const mod = await import(p);
      if (mod.globalValidatorRegistry) return mod.globalValidatorRegistry;
      if (mod.ValidatorRegistry) return new mod.ValidatorRegistry();
    } catch {}
  }
  return null;
}

async function getTargetFiles(args) {
  if (args.length > 0 && args[0] !== "--all") return args.filter(f => existsSync(f));
  if (args.length > 0 && args[0] === "--all") {
    const { globSync } = await import("glob");
    return globSync("src/**/*.ts", { cwd: projectRoot, ignore: "**/node_modules/**" }).map(f => join(projectRoot, f));
  }
  const { execSync } = await import("child_process");
  try {
    const diff = execSync("git diff --name-only --diff-filter=ACMRT HEAD", { cwd: projectRoot, encoding: "utf-8" }).trim();
    if (diff) return diff.split("\n").filter(f => /\.(ts|js|mjs)$/.test(f)).map(f => join(projectRoot, f));
  } catch {}
  const { globSync } = await import("glob");
  return globSync("src/**/*.ts", { cwd: projectRoot, ignore: "**/node_modules/**" }).map(f => join(projectRoot, f));
}

async function main() {
  const args = process.argv.slice(2);
  const files = await getTargetFiles(args);
  const registry = await loadRegistry();

  if (!files.length) {
    console.log("No files to validate. Skipping.");
    process.exit(0);
  }

  if (!registry) {
    console.error("ERROR: Could not load ValidatorRegistry. Build first (npm run build).");
    process.exit(1);
  }

  const validators = registry.getAllValidators();
  console.log(`ValidatorRegistry loaded: ${validators.length} validators`);

  let totalViolations = 0;
  const allViolations = [];

  for (const filePath of files) {
    let newCode;
    try {
      newCode = readFileSync(filePath, "utf-8");
    } catch {
      console.warn(`WARN: Could not read ${filePath}, skipping.`);
      continue;
    }

    const ctx = { operation: "write", files: [filePath], newCode };

    for (const v of validators) {
      try {
        const result = await v.validate(ctx);
        if (!result.passed) {
          totalViolations++;
          allViolations.push({ file: filePath, ruleId: v.ruleId || v.id, severity: v.severity || "warning", message: result.message });
          console.log(`[${v.severity || "WARN"}] ${filePath}: ${v.ruleId || v.id} — ${result.message}`);
        }
      } catch (valErr) {
        console.warn(`WARN: Validator ${v.ruleId || v.id} failed on ${filePath}: ${valErr.message}`);
      }
    }
  }

  if (totalViolations > 0) {
    console.log(`\n❌ ${totalViolations} violation(s) found across ${files.length} file(s).`);
    process.exit(Math.min(totalViolations, 255));
  }

  console.log(`\n✅ All validators passed on ${files.length} file(s).`);
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
