import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadSessionInferences } from "../../../inference/inference-accumulator.js";
import { captureCompletedInferenceOperation } from "../../../inference/session-capture.js";
import { recordLesson } from "../../../memory-routing/record-lesson.js";

vi.mock("../../../memory-routing/record-lesson.js", () => ({
  recordLesson: vi.fn(() => []),
}));

const FORBIDDEN_SESSION_IDS = [
  "session-2026-09-23-9deed910b",
  "session-2026-09-23-2eb24387e",
];

describe("captureCompletedInferenceOperation", () => {
  const roots: string[] = [];

  afterEach(() => {
    vi.mocked(recordLesson).mockClear();
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function layout(): { promptsDir: string; inferenceDir: string } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "xray-op-capture-"));
    roots.push(root);
    const promptsDir = path.join(root, "prompts");
    const inferenceDir = path.join(root, "docs", "inference");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.mkdirSync(inferenceDir, { recursive: true });
    return { promptsDir, inferenceDir };
  }

  function sessionFiles(inferenceDir: string): string[] {
    return fs.readdirSync(inferenceDir).filter((name) => name.startsWith("session-") && name.endsWith(".json"));
  }

  it("writes one accumulator session when speech names a stored signal", () => {
    const { promptsDir, inferenceDir } = layout();
    const operationId = "inference-finished";
    const failed = `I stopped after the file was missing. ${"x".repeat(420)}`;
    fs.writeFileSync(
      path.join(promptsDir, `${operationId}.result.md`),
      [
        `operation: ${operationId}`,
        "",
        "Tried: I followed the diary and the sentence already named wake-cascade.",
        "Worked: The stored signal wake-cascade stayed on the line a friend could hear.",
        `Failed: ${failed}`,
        "",
      ].join("\n"),
    );

    const saved = captureCompletedInferenceOperation({
      operationId,
      promptsDir,
      inferenceDir,
      signalNames: ["wake-cascade", "heat-is-not-conviction"],
    });

    expect(saved).toBeTruthy();
    expect(path.basename(saved ?? "")).toMatch(/^session-.*\.json$/);
    expect(sessionFiles(inferenceDir)).toEqual([path.basename(saved ?? "")]);

    const loaded = loadSessionInferences(inferenceDir);
    expect(loaded).toHaveLength(1);
    const session = loaded[0];
    expect(session?.sessionId).toMatch(/^session-\d{4}-\d{2}-\d{2}-inference-finished$/);
    expect(FORBIDDEN_SESSION_IDS).not.toContain(session?.sessionId);
    expect(session?.approaches[0]).toContain("wake-cascade");
    expect(session?.solutions[0]).toContain("a friend could hear");
    expect(session?.wrongTurns[0]?.startsWith("I stopped after the file was missing.")).toBe(true);
    expect((session?.approaches[0] ?? "").length).toBeLessThanOrEqual(400);
    expect((session?.solutions[0] ?? "").length).toBeLessThanOrEqual(400);
    expect((session?.wrongTurns[0] ?? "").length).toBeLessThanOrEqual(400);
    expect(session?.wrongTurns[0]?.length).toBe(400);
    expect(session?.matched_primitives).toEqual(["wake-cascade"]);
    expect(session?.matchedPrimitives).toEqual(["wake-cascade"]);
    expect(recordLesson).not.toHaveBeenCalled();

    const again = captureCompletedInferenceOperation({
      operationId,
      promptsDir,
      inferenceDir,
      signalNames: ["wake-cascade"],
    });
    expect(again).toBeNull();
    expect(sessionFiles(inferenceDir)).toHaveLength(1);
    expect(recordLesson).not.toHaveBeenCalled();
  });

  it("writes nothing when the operation has no speech", () => {
    const { promptsDir, inferenceDir } = layout();
    const operationId = "inference-empty";
    fs.writeFileSync(
      path.join(promptsDir, "01-researcher.md"),
      "# Researcher: Data Gathering Phase\n\n## Task\nAnalyze the logs.\n",
    );
    fs.writeFileSync(path.join(promptsDir, `${operationId}.result.md`), " \n\t\n");

    const saved = captureCompletedInferenceOperation({
      operationId,
      promptsDir,
      inferenceDir,
      signalNames: ["wake-cascade"],
    });

    expect(saved).toBeNull();
    expect(sessionFiles(inferenceDir)).toEqual([]);
    expect(fs.existsSync(path.join(inferenceDir, "latest-session.json"))).toBe(false);
    expect(recordLesson).not.toHaveBeenCalled();
  });
});
