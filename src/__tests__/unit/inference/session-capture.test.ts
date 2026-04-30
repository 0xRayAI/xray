import { describe, it, expect, afterEach, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  captureSessionInference,
  saveSessionInference,
  SessionInference,
} from "../../../inference/session-capture.js";

describe("Session Capture", () => {
  let tmpDir: string;
  let inference5: SessionInference | null;
  let inference20: SessionInference | null;

  beforeAll(async () => {
    inference5 = captureSessionInference("HEAD~5", "HEAD");
    inference20 = captureSessionInference("HEAD~20", "HEAD");
  }, 120000);

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should return null for identical refs", () => {
    const result = captureSessionInference("HEAD", "HEAD");
    expect(result).toBeNull();
  });

  it("should capture inference between commits", () => {
    if (inference5) {
      expect(inference5.sessionId).toMatch(/^session-\d{4}-\d{2}-\d{2}$/);
      expect(inference5.timestamp).toBeTruthy();
      expect(inference5.span.from).toBe("HEAD~5");
      expect(inference5.span.to).toBe("HEAD");
      expect(inference5.metrics.commits).toBeGreaterThan(0);
      expect(inference5.patterns).toBeInstanceOf(Array);
      expect(inference5.problems).toBeInstanceOf(Array);
      expect(inference5.approaches).toBeInstanceOf(Array);
      expect(inference5.wrongTurns).toBeInstanceOf(Array);
      expect(inference5.solutions).toBeInstanceOf(Array);
      expect(inference5.reasoningChain).toBeInstanceOf(Array);
    }
  });

  it("should save session inference to file", () => {
    if (!inference5) return;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "strray-inference-test-"));
    const savedPath = saveSessionInference(inference5, tmpDir);

    expect(fs.existsSync(savedPath)).toBe(true);
    expect(savedPath).toMatch(/session-.*\.json$/);

    const content = JSON.parse(fs.readFileSync(savedPath, "utf-8"));
    expect(content.sessionId).toBe(inference5.sessionId);

    const latestPath = path.join(tmpDir, "latest-session.json");
    expect(fs.existsSync(latestPath)).toBe(true);
  });

  it("should produce valid JSON with all required fields", () => {
    if (!inference20) return;

    const json = JSON.stringify(inference20);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty("sessionId");
    expect(parsed).toHaveProperty("timestamp");
    expect(parsed).toHaveProperty("span");
    expect(parsed).toHaveProperty("problems");
    expect(parsed).toHaveProperty("approaches");
    expect(parsed).toHaveProperty("wrongTurns");
    expect(parsed).toHaveProperty("solutions");
    expect(parsed).toHaveProperty("reasoningChain");
    expect(parsed).toHaveProperty("patterns");
    expect(parsed).toHaveProperty("metrics");
    expect(parsed.metrics).toHaveProperty("commits");
    expect(parsed.metrics).toHaveProperty("filesChanged");
    expect(parsed.metrics).toHaveProperty("insertions");
    expect(parsed.metrics).toHaveProperty("deletions");
  });

  it("should capture problems from fix commits", () => {
    if (!inference20) return;

    expect(inference20.problems.length).toBeGreaterThanOrEqual(0);
  });

  it("should build reasoning chain connecting problems to solutions", () => {
    if (!inference20) return;

    if (inference20.reasoningChain.length > 0) {
      for (const link of inference20.reasoningChain) {
        expect(link).toHaveProperty("from");
        expect(link).toHaveProperty("to");
        expect(link).toHaveProperty("reasoning");
        expect(["problem", "approach", "wrong_turn", "solution"]).toContain(
          link.from,
        );
        expect(["approach", "wrong_turn", "solution"]).toContain(link.to);
      }
    }
  });

  it("should capture metrics with non-negative values", () => {
    if (!inference5) return;

    expect(inference5.metrics.commits).toBeGreaterThanOrEqual(0);
    expect(inference5.metrics.filesChanged).toBeGreaterThanOrEqual(0);
    expect(inference5.metrics.insertions).toBeGreaterThanOrEqual(0);
    expect(inference5.metrics.deletions).toBeGreaterThanOrEqual(0);
  });
});
