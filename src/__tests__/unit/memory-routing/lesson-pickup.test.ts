import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { writeLessonPickup } from "../../../memory-routing/lesson-pickup.js";

describe("lesson pickup", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes graded lines for laws above the floor onto Station", () => {
    tempDir = mkdtempSync(join(tmpdir(), "xray-lesson-pickup-"));
    const state = join(tempDir, ".xray", "state");
    mkdirSync(join(state, "repertoire"), { recursive: true });
    writeFileSync(join(state, "STATION.md"), "# Station\n\nGit: here\n");
    writeFileSync(join(state, "repertoire", "curated_signals.json"), JSON.stringify({
      signals: [
        {
          name: "wake-cascade",
          definition: "Chat is not the brain.",
          observation_stats: { avg_confidence: 0.65 },
          lessons: [{ taskId: "named:wake-cascade:sess-1", decision: "success", text: "fix: observe the law", at: "2026-09-23T20:00:00.000Z" }],
        },
        {
          name: "heat-is-not-conviction",
          definition: "Heat touches last_seen.",
          observation_stats: { avg_confidence: 0.55 },
          lessons: [{ taskId: "heat", decision: "success", text: "should stay off the card", at: "2026-09-23T20:00:00.000Z" }],
        },
      ],
    }));

    writeLessonPickup(tempDir);
    const card = readFileSync(join(state, "STATION.md"), "utf-8");
    expect(card).toContain("Git: here");
    expect(card).toContain("### wake-cascade");
    expect(card).toContain("Chat is not the brain.");
    expect(card).toContain("fix: observe the law");
    expect(card).not.toContain("should stay off the card");

    writeLessonPickup(tempDir);
    const again = readFileSync(join(state, "STATION.md"), "utf-8");
    expect(again.match(/<!-- lessons -->/g)).toHaveLength(1);
  });
});