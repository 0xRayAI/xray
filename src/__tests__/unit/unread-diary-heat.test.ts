import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectUnreadSuitDiary } from "../../integrations/hooks/station-memory-ingest.mjs";
import { recordLesson } from "../../memory-routing/record-lesson.js";

vi.mock("../../memory-routing/record-lesson.js", () => ({
  recordLesson: vi.fn(() => []),
}));

const SIGNAL = "heat-is-not-conviction";

interface ObservationStats {
  observation_count: number;
  avg_confidence: number;
  last_seen: string;
}

interface StoredSignal {
  name: string;
  observation_stats?: ObservationStats;
  lessons?: unknown[];
}

describe("unread suit diary heat", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("touches last_seen from an unread diary file and does not call the lesson writer", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "xray-unread-diary-"));
    const diaryPath = join(tempDir, ".xray", "inference", "postprocessor-light-latest.json");
    mkdirSync(join(tempDir, ".xray", "inference"), { recursive: true });
    writeFileSync(
      diaryPath,
      `${JSON.stringify({
        phase: "post-process-light",
        tool: "Write",
        note: SIGNAL,
      })}\n`,
    );
    const signalsPath = join(tempDir, "signals.json");
    writeFileSync(
      signalsPath,
      `${JSON.stringify({
        description: "unread diary heat",
        schema_version: "1",
        last_updated: "2026-01-01T00:00:00.000Z",
        signals: [
          {
            name: SIGNAL,
            definition: "Heat touches last_seen and does not append a lesson.",
            tags: ["stack"],
            priority: "high",
            evaluation_criteria: "last_seen moves. the average does not.",
            validation_experiment: "Heat the unread diary.",
            master_index_integration: "Project dest only.",
            implementation_notes: "Not a graded session.",
            observation_stats: {
              observation_count: 2,
              avg_confidence: 0.7,
              max_confidence: 0.7,
              last_seen: "2026-01-01T00:00:00.000Z",
              governance_forced_count: 0,
            },
            lessons: [],
          },
        ],
      })}\n`,
    );

    const diary = collectUnreadSuitDiary(tempDir);
    expect(diary.sources).toContain(diaryPath);
    expect(diary.text).toContain(SIGNAL);
    expect(diary.sources.some((source) => source.endsWith("latest-session.json"))).toBe(false);
    expect(diary.sources.some((source) => source.includes("session-"))).toBe(false);

    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
    const organUrl = pathToFileURL(
      join(repoRoot, "vendor", "@0xray", "repertoire", "dist", "RepertoireService.js"),
    ).href;
    const organ = await import(organUrl) as {
      RepertoireService: new (options: {
        projectRoot: string;
        signalsPath: string;
        syncXray: boolean;
        syncField: boolean;
      }) => {
        heatKernelDiary: (collected: { text: string; sources: string[] }) => { heated: string[] };
        signalsManager: { getByName: (name: string) => StoredSignal | undefined };
      };
    };
    const service = new organ.RepertoireService({
      projectRoot: tempDir,
      signalsPath,
      syncXray: false,
      syncField: false,
    });
    const before = service.signalsManager.getByName(SIGNAL)?.observation_stats;
    if (!before) throw new Error("stored signal missing");

    const heated = service.heatKernelDiary(diary);
    expect(heated.heated).toContain(SIGNAL);
    expect(recordLesson).not.toHaveBeenCalled();

    const after = service.signalsManager.getByName(SIGNAL);
    expect(after?.observation_stats?.observation_count).toBe(before.observation_count);
    expect(after?.observation_stats?.avg_confidence).toBe(before.avg_confidence);
    expect(after?.observation_stats?.last_seen).not.toBe(before.last_seen);
    expect(after?.lessons ?? []).toEqual([]);

    const saved = JSON.parse(readFileSync(signalsPath, "utf8")) as { signals: StoredSignal[] };
    const row = saved.signals.find((signal) => signal.name === SIGNAL);
    expect(row?.observation_stats?.avg_confidence).toBe(0.7);
    expect(row?.observation_stats?.observation_count).toBe(2);
    expect(row?.lessons ?? []).toEqual([]);
  });
});
