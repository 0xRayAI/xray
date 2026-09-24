import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { accumulateCorpus, loadReflectionInferences } from "../../../inference/inference-accumulator.js";

describe("reflection corpus", () => {
  let projectRoot: string;
  let inferenceDir: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xray-reflection-"));
    inferenceDir = path.join(projectRoot, "docs", "inference");
    fs.mkdirSync(inferenceDir, { recursive: true });
    fs.mkdirSync(path.join(projectRoot, ".xray", "state", "repertoire"), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, ".xray", "state", "repertoire", "curated_signals.json"),
      JSON.stringify({ signals: [{ name: "heat-is-not-conviction" }] }),
    );
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it("reads a reflection as speech and names the signal it states", () => {
    const reflections = path.join(projectRoot, "docs", "reflections");
    fs.mkdirSync(reflections, { recursive: true });
    fs.writeFileSync(
      path.join(reflections, "heat-note.md"),
      "Tried: the diary path.\nWorked: heat-is-not-conviction only moves last_seen.\n",
    );

    const loaded = loadReflectionInferences(inferenceDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.sessionId).toBe("session-reflection-heat-note");
    expect(loaded[0]?.matched_primitives).toEqual(["heat-is-not-conviction"]);
    expect(loaded[0]?.approaches.length).toBeGreaterThan(0);
    expect(fs.readdirSync(inferenceDir)).toEqual([]);

    const corpus = accumulateCorpus(inferenceDir);
    expect(corpus.sessions.map((session) => session.sessionId)).toContain("session-reflection-heat-note");
  });
});
