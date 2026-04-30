import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  shouldTriggerCycle,
  accumulateCorpus,
  loadSessionInferences,
} from "../../../inference/inference-accumulator.js";
import { SessionInference } from "../../../inference/session-capture.js";

function makeSession(id: string, commits: number, patterns: string[]): SessionInference {
  return {
    sessionId: id,
    timestamp: new Date().toISOString(),
    span: { from: "HEAD~10", to: "HEAD" },
    problems: ["Bug: test bug"],
    approaches: ["Extract methods"],
    wrongTurns: ["Path handling bug"],
    solutions: ["Applied fix"],
    reasoningChain: [],
    patterns: patterns.map((name, i) => ({
      name,
      confidence: 0.8 + i * 0.05,
      evidence: [`evidence for ${name}`],
      description: `${name} pattern detected`,
    })),
    metrics: {
      commits,
      filesChanged: 10,
      insertions: 100,
      deletions: 50,
      filesAdded: 2,
      filesDeleted: 1,
      uniqueDirs: 3,
    },
  };
}

describe("Inference Accumulator", () => {
  let tmpDir: string;
  let inferenceDir: string;
  let stateDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "strray-accum-test-"));
    inferenceDir = path.join(tmpDir, "inference");
    stateDir = path.join(tmpDir, "state");
    fs.mkdirSync(inferenceDir, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSession(id: string, commits: number, patterns: string[] = ["Extract Method"]) {
    const session = makeSession(id, commits, patterns);
    fs.writeFileSync(
      path.join(inferenceDir, `session-${id}.json`),
      JSON.stringify(session),
    );
  }

  it("should not trigger with fewer than 3 sessions", () => {
    writeSession("a", 10);
    writeSession("b", 10);
    const result = shouldTriggerCycle(inferenceDir, path.join(stateDir, "cycle.json"));
    expect(result.trigger).toBe(false);
    expect(result.reason).toContain("2/3");
  });

  it("should trigger with 3+ sessions and no previous cycle", () => {
    writeSession("a", 15);
    writeSession("b", 10);
    writeSession("c", 10);
    const result = shouldTriggerCycle(inferenceDir, path.join(stateDir, "cycle.json"));
    expect(result.trigger).toBe(true);
  });

  it("should not trigger within 3 days of last cycle", () => {
    writeSession("a", 15);
    writeSession("b", 10);
    writeSession("c", 10);
    fs.writeFileSync(
      path.join(stateDir, "cycle.json"),
      JSON.stringify({ completedAt: new Date().toISOString() }),
    );
    const result = shouldTriggerCycle(inferenceDir, path.join(stateDir, "cycle.json"));
    expect(result.trigger).toBe(false);
    expect(result.reason).toContain("days since last");
  });

  it("should trigger after 7 days even with few commits", () => {
    writeSession("a", 5);
    writeSession("b", 5);
    writeSession("c", 5);
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    fs.writeFileSync(
      path.join(stateDir, "cycle.json"),
      JSON.stringify({ completedAt: oldDate }),
    );
    const result = shouldTriggerCycle(inferenceDir, path.join(stateDir, "cycle.json"));
    expect(result.trigger).toBe(true);
  });

  it("should accumulate corpus with recurring patterns", () => {
    writeSession("a", 10, ["Extract Method", "Registry Pattern"]);
    writeSession("b", 10, ["Extract Method", "Dead Code Removal"]);
    writeSession("c", 10, ["Extract Method"]);

    const corpus = accumulateCorpus(inferenceDir);

    expect(corpus.sessions.length).toBe(3);
    expect(corpus.totalCommits).toBe(30);

    const extractMethod = corpus.recurringPatterns.find((p) => p.name === "Extract Method");
    expect(extractMethod).toBeDefined();
    expect(extractMethod!.occurrences).toBe(3);

    const registry = corpus.recurringPatterns.find((p) => p.name === "Registry Pattern");
    expect(registry).toBeDefined();
    expect(registry!.occurrences).toBe(1);
  });

  it("should find recurring problems across sessions", () => {
    writeSession("a", 10);
    writeSession("b", 10);
    writeSession("c", 10);

    const corpus = accumulateCorpus(inferenceDir);
    expect(corpus.recurringProblems.length).toBeGreaterThan(0);
    expect(corpus.recurringProblems[0]!.occurrences).toBe(3);
  });

  it("should deduplicate approaches", () => {
    writeSession("a", 10);
    writeSession("b", 10);
    writeSession("c", 10);

    const corpus = accumulateCorpus(inferenceDir);
    const approachSet = new Set(corpus.uniqueApproaches);
    expect(approachSet.size).toBe(corpus.uniqueApproaches.length);
  });

  it("should return empty corpus for nonexistent directory", () => {
    const sessions = loadSessionInferences("/nonexistent/path");
    expect(sessions).toEqual([]);
  });

  it("should handle malformed session files gracefully", () => {
    writeSession("a", 10);
    fs.writeFileSync(path.join(inferenceDir, "session-bad.json"), "not json {{{");
    writeSession("b", 10);

    const sessions = loadSessionInferences(inferenceDir);
    expect(sessions.length).toBe(2);
  });

  it("should sort recurring patterns by frequency then confidence", () => {
    writeSession("a", 10, ["Registry Pattern", "Extract Method"]);
    writeSession("b", 10, ["Extract Method"]);
    writeSession("c", 10, ["Extract Method"]);

    const corpus = accumulateCorpus(inferenceDir);
    expect(corpus.recurringPatterns[0]!.name).toBe("Extract Method");
    expect(corpus.recurringPatterns[0]!.occurrences).toBe(3);
  });
});
