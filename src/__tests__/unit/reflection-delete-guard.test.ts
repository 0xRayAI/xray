import { describe, expect, it } from "vitest";
import {
  evaluateReflectionDeleteGuard,
  hasAllowlistedApproval,
  parseApproverAllowlist,
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
});
