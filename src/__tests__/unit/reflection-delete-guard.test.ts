import { describe, expect, it } from "vitest";
import {
  APPROVAL_LINE,
  evaluateReflectionDeleteGuard,
} from "../../../scripts/node/reflection-delete-guard.mjs";

describe("reflection delete guard", () => {
  it("allows adds and edits under the protected trees", () => {
    const diff = [
      "A\tdocs/reflections/restored/docs/reflections/note.md",
      "M\tdocs/reflections/v3-deep-reflection.md",
      "D\tdocs/archive/old.md",
      "R100\tdocs/archive/a.md\tdocs/archive/b.md",
    ].join("\n");
    const result = evaluateReflectionDeleteGuard(diff, "");
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("blocks a deletion under docs/reflections or docs/deep-reflections", () => {
    const diff = [
      "D\tdocs/reflections/v3-deep-reflection.md",
      "D\tdocs/deep-reflections/enforcer-story.md",
    ].join("\n");
    const result = evaluateReflectionDeleteGuard(diff, "please delete these");
    expect(result.ok).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.violations.map((item) => item.path)).toEqual([
      "docs/reflections/v3-deep-reflection.md",
      "docs/deep-reflections/enforcer-story.md",
    ]);
  });

  it("blocks a rename whose old path is protected", () => {
    const diff = "R100\tdocs/reflections/a.md\tdocs/archive/a.md";
    const result = evaluateReflectionDeleteGuard(diff, "");
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual([
      { status: "R100", path: "docs/archive/a.md", oldPath: "docs/reflections/a.md" },
    ]);
  });

  it("allows the same diff when the PR body has the exact approval line", () => {
    const diff = "D\tdocs/reflections/a.md";
    const body = `context\n${APPROVAL_LINE}\nthanks`;
    const result = evaluateReflectionDeleteGuard(diff, body);
    expect(result.ok).toBe(true);
    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(1);
  });

  it("does not treat a substring or padded approval as the literal line", () => {
    const diff = "D\tdocs/deep-reflections/a.md";
    expect(evaluateReflectionDeleteGuard(diff, `note ${APPROVAL_LINE} trailing`).ok).toBe(false);
    expect(evaluateReflectionDeleteGuard(diff, `${APPROVAL_LINE} `).ok).toBe(false);
    expect(evaluateReflectionDeleteGuard(diff, null).ok).toBe(false);
  });
});
