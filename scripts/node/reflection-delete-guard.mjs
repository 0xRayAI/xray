#!/usr/bin/env node
/**
 * Fail a pull request that deletes or renames a file under
 * docs/reflections/ or docs/deep-reflections/ unless the PR body
 * contains the literal line REFLECTION-DELETE-APPROVED-BY-BLAZE.
 */
import { execFileSync, spawnSync } from "node:child_process";

export const APPROVAL_LINE = "REFLECTION-DELETE-APPROVED-BY-BLAZE";

const PROTECTED_PREFIXES = ["docs/reflections/", "docs/deep-reflections/"];

export function isProtectedReflectionPath(filePath) {
  return PROTECTED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

export function prBodyApprovesReflectionDelete(prBody) {
  if (typeof prBody !== "string") return false;
  return prBody.split(/\r?\n/).includes(APPROVAL_LINE);
}

/**
 * @param {string} nameStatus git diff --name-status --find-renames output
 * @param {string | null | undefined} prBody
 */
export function evaluateReflectionDeleteGuard(nameStatus, prBody) {
  const violations = [];
  for (const line of String(nameStatus ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0] ?? "";
    if (status.startsWith("D")) {
      const filePath = parts[1] ?? "";
      if (isProtectedReflectionPath(filePath)) {
        violations.push({ status, path: filePath });
      }
      continue;
    }
    if (status.startsWith("R")) {
      const oldPath = parts[1] ?? "";
      const filePath = parts[2] ?? "";
      if (isProtectedReflectionPath(oldPath)) {
        violations.push({ status, path: filePath, oldPath });
      }
    }
  }
  const approved = prBodyApprovesReflectionDelete(prBody);
  return {
    ok: violations.length === 0 || approved,
    violations,
    approved,
  };
}

function commitExists(sha) {
  const probe = spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" });
  return probe.status === 0;
}

function ensureCommit(sha) {
  if (commitExists(sha)) return;
  const fetched = spawnSync("git", ["fetch", "--no-tags", "origin", sha], { stdio: "inherit" });
  if (fetched.status !== 0 || !commitExists(sha)) {
    process.stderr.write(`reflection-delete-guard: cannot resolve ${sha}\n`);
    process.exit(1);
  }
}

function main() {
  const base = process.env.BASE_SHA ?? "";
  const head = process.env.HEAD_SHA ?? "";
  if (!base || !head) {
    process.stdout.write("reflection-delete-guard: skipped (no pull request SHAs)\n");
    process.exit(0);
  }
  ensureCommit(base);
  ensureCommit(head);
  const nameStatus = execFileSync(
    "git",
    ["-c", "core.quotepath=false", "diff", "--name-status", "--find-renames", base, head],
    { encoding: "utf8" },
  );
  const result = evaluateReflectionDeleteGuard(nameStatus, process.env.PR_BODY ?? "");
  if (result.ok) {
    process.stdout.write(
      `reflection-delete-guard: ok (${result.violations.length} protected change(s), approved=${result.approved})\n`,
    );
    process.exit(0);
  }
  process.stderr.write("reflection-delete-guard: blocked deletion or rename under docs/reflections or docs/deep-reflections\n");
  for (const violation of result.violations) {
    const from = violation.oldPath ? `${violation.oldPath} -> ` : "";
    process.stderr.write(`${violation.status}\t${from}${violation.path}\n`);
  }
  process.stderr.write(`Override by putting this exact line in the PR body:\n${APPROVAL_LINE}\n`);
  process.exit(1);
}

const isMain = process.argv[1] && process.argv[1].endsWith("reflection-delete-guard.mjs");
if (isMain) main();
