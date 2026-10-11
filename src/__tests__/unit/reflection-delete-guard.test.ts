import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  evaluateReflectionDeleteGuard,
  hasAllowlistedApproval,
  parseApproverAllowlist,
  readAllowlistAtBase,
} from "../../../scripts/node/reflection-delete-guard.mjs";

const HEAD = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OLDER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ALLOWLIST = ["htafolla"];

function approval(reviews: Array<{ state: string; commit_id: string; user: { login: string } }>) {
  return { headSha: HEAD, allowlist: ALLOWLIST, reviews };
}

describe("reflection delete guard", () => {
  it("allows adds and edits under the protected trees", () => {
    const diff = [
      "A\tdocs/reflections/restored/docs/reflections/note.md",
      "M\tdocs/reflections/v3-deep-reflection.md",
      "D\tdocs/archive/old.md",
      "R100\tdocs/archive/a.md\tdocs/archive/b.md",
    ].join("\n");
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("blocks a deletion under docs/reflections or docs/deep-reflections", () => {
    const diff = [
      "D\tdocs/reflections/v3-deep-reflection.md",
      "D\tdocs/deep-reflections/enforcer-story.md",
    ].join("\n");
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.violations.map((item) => item.path)).toEqual([
      "docs/reflections/v3-deep-reflection.md",
      "docs/deep-reflections/enforcer-story.md",
    ]);
  });

  it("blocks a rename whose old path is protected", () => {
    const diff = "R100\tdocs/reflections/a.md\tdocs/archive/a.md";
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual([
      { status: "R100", path: "docs/archive/a.md", oldPath: "docs/reflections/a.md" },
    ]);
  });

  it("fails when nobody has approved the deletion", () => {
    const diff = "D\tdocs/reflections/a.md";
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
    expect(hasAllowlistedApproval([], ALLOWLIST, HEAD)).toBe(false);
  });

  it("fails when the approval is from a login that is not on the allowlist", () => {
    const diff = "D\tdocs/deep-reflections/a.md";
    const reviews = [{ state: "APPROVED", commit_id: HEAD, user: { login: "someone-else" } }];
    const result = evaluateReflectionDeleteGuard(diff, approval(reviews));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
  });

  it("fails when an allowlisted approval is on an older head", () => {
    const diff = "D\tdocs/reflections/a.md";
    const reviews = [{ state: "APPROVED", commit_id: OLDER, user: { login: "htafolla" } }];
    const result = evaluateReflectionDeleteGuard(diff, approval(reviews));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
  });

  it("passes when an allowlisted account approved the current head", () => {
    const diff = "D\tdocs/reflections/a.md\nR100\tdocs/deep-reflections/b.md\tdocs/archive/b.md";
    const reviews = [
      { state: "COMMENTED", commit_id: HEAD, user: { login: "htafolla" } },
      { state: "APPROVED", commit_id: HEAD, user: { login: "htafolla" } },
    ];
    const result = evaluateReflectionDeleteGuard(diff, approval(reviews));
    expect(result.ok).toBe(true);
    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(2);
  });

  it("does not treat a pull request body line as a bypass", () => {
    const diff = "D\tdocs/reflections/a.md";
    const result = evaluateReflectionDeleteGuard(diff, {
      headSha: HEAD,
      allowlist: ALLOWLIST,
      reviews: [],
      prBody: "REFLECTION-DELETE-APPROVED-BY-BLAZE",
    });
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
  });

  it("reads allowlist logins and skips blank and comment lines", () => {
    expect(parseApproverAllowlist("# note\n\nhtafolla\n  \n# other\n")).toEqual(["htafolla"]);
  });

  it("fails when a pull request adds its own account to the allowlist", () => {
    const diff = "M\t.github/reflection-guard-approvers.txt";
    const reviews = [{ state: "APPROVED", commit_id: HEAD, user: { login: "self-added" } }];
    const result = evaluateReflectionDeleteGuard(diff, approval(reviews));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.violations).toEqual([
      { status: "M", path: ".github/reflection-guard-approvers.txt" },
    ]);
  });

  it("fails when a pull request edits the guard workflow without an approval", () => {
    const diff = "M\t.github/workflows/mill-ci.yml";
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.violations).toEqual([{ status: "M", path: ".github/workflows/mill-ci.yml" }]);
  });

  it("fails when a pull request edits the guard script or its test without an approval", () => {
    const diff = [
      "M\tscripts/node/reflection-delete-guard.mjs",
      "D\tsrc/__tests__/unit/reflection-delete-guard.test.ts",
    ].join("\n");
    const result = evaluateReflectionDeleteGuard(diff, approval([]));
    expect(result.ok).toBe(false);
    expect(result.violations.map((item) => item.path)).toEqual([
      "scripts/node/reflection-delete-guard.mjs",
      "src/__tests__/unit/reflection-delete-guard.test.ts",
    ]);
  });

  it("passes a guard-file edit when the base allowlist approved the current head", () => {
    const diff = "M\t.github/workflows/mill-ci.yml";
    const reviews = [{ state: "APPROVED", commit_id: HEAD, user: { login: "htafolla" } }];
    const result = evaluateReflectionDeleteGuard(diff, approval(reviews));
    expect(result.ok).toBe(true);
    expect(result.approved).toBe(true);
  });

  it("reads the allowlist from the base ref, not the checkout", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "reflection-guard-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    try {
      git("init", "-b", "main");
      git("config", "user.email", "guard@example.com");
      git("config", "user.name", "guard");
      const allowlist = path.join(dir, ".github", "reflection-guard-approvers.txt");
      mkdirSync(path.dirname(allowlist), { recursive: true });
      writeFileSync(allowlist, "htafolla\n");
      git("add", ".github/reflection-guard-approvers.txt");
      git("commit", "-m", "base allowlist");
      const base = git("rev-parse", "HEAD").trim();
      writeFileSync(allowlist, "htafolla\nself-added\n");
      git("add", ".github/reflection-guard-approvers.txt");
      git("commit", "-m", "pr adds its own account");
      expect(readAllowlistAtBase(base, dir)).toEqual(["htafolla"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
