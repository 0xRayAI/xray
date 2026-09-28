#!/usr/bin/env node
/**
 * Fail a pull request that deletes or renames a file under
 * docs/reflections/ or docs/deep-reflections/ unless an allowlisted
 * GitHub account has an APPROVED review on the pull request's current head.
 * A line in the pull request body is not a bypass. A review of an older head is not a bypass.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROTECTED_PREFIXES = ["docs/reflections/", "docs/deep-reflections/"];
const ALLOWLIST_PATH = ".github/reflection-guard-approvers.txt";

export function isProtectedReflectionPath(filePath) {
  return PROTECTED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

export function parseApproverAllowlist(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * @param {Array<{ state?: string, commit_id?: string, user?: { login?: string } | null }> | null | undefined} reviews
 * @param {string[]} allowlist
 * @param {string} headSha
 */
export function hasAllowlistedApproval(reviews, allowlist, headSha) {
  if (!headSha || !Array.isArray(reviews) || !Array.isArray(allowlist)) return false;
  const allowed = new Set(allowlist);
  return reviews.some((review) => {
    if (!review || review.state !== "APPROVED") return false;
    if (review.commit_id !== headSha) return false;
    const login = review.user && typeof review.user.login === "string" ? review.user.login : "";
    return allowed.has(login);
  });
}

/**
 * @param {string} nameStatus git diff --name-status --find-renames output
 * @param {{ reviews?: Array<{ state?: string, commit_id?: string, user?: { login?: string } | null }>, allowlist?: string[], headSha?: string }} approval
 */
export function evaluateReflectionDeleteGuard(nameStatus, approval) {
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
  const approved = hasAllowlistedApproval(
    approval?.reviews,
    approval?.allowlist ?? [],
    approval?.headSha ?? "",
  );
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

async function fetchPullRequestReviews(repo, prNumber, token) {
  const reviews = [];
  let page = 1;
  for (;;) {
    const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "xray-reflection-delete-guard",
      },
    });
    if (!response.ok) {
      process.stderr.write(`reflection-delete-guard: reviews API HTTP ${response.status}\n`);
      process.exit(1);
    }
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    reviews.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return reviews;
}

function readAllowlist() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  return parseApproverAllowlist(readFileSync(path.join(root, ALLOWLIST_PATH), "utf8"));
}

async function main() {
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
  const preliminary = evaluateReflectionDeleteGuard(nameStatus, { reviews: [], allowlist: [], headSha: head });
  let reviews = [];
  let allowlist = [];
  if (preliminary.violations.length > 0) {
    const token = process.env.GITHUB_TOKEN ?? "";
    const repo = process.env.GITHUB_REPOSITORY ?? "";
    const prNumber = process.env.PR_NUMBER ?? "";
    if (!token || !repo || !prNumber) {
      process.stderr.write("reflection-delete-guard: cannot read reviews (GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER required)\n");
      process.exit(1);
    }
    allowlist = readAllowlist();
    reviews = await fetchPullRequestReviews(repo, prNumber, token);
  }
  const result = evaluateReflectionDeleteGuard(nameStatus, { reviews, allowlist, headSha: head });
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
  process.stderr.write(
    "Bypass is an APPROVED review on this head SHA by a login in .github/reflection-guard-approvers.txt. A pull request body line is not a bypass.\n",
  );
  process.exit(1);
}

const isMain = process.argv[1] && process.argv[1].endsWith("reflection-delete-guard.mjs");
if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`reflection-delete-guard: ${message}\n`);
    process.exit(1);
  });
}
