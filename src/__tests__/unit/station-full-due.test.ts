import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { writeStationMarkdown } from "../../integrations/hooks/station-hook-runtime.mjs";

const DUE = "Full: due. OP-PROC#station-boot #station-nudge. --prompt is step 1. Ack only after that read.";

describe("station full due", () => {
  it("keeps a compact Full line on the next card write", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "station-full-"));
    writeStationMarkdown(root, { host: "grok", intent: "tip", fullLine: DUE });
    const first = fs.readFileSync(path.join(root, ".xray", "state", "STATION.md"), "utf8");
    expect(first).toContain(DUE);
    writeStationMarkdown(root, { host: "grok", intent: "tip" });
    const second = fs.readFileSync(path.join(root, ".xray", "state", "STATION.md"), "utf8");
    expect(second).toContain(DUE);
    const hits = second.split(/\r?\n/).filter((line) => line.startsWith("Full:"));
    expect(hits).toEqual([DUE]);
  });
});
