import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatSuitPicture, readSuitPicture } from "../../cli/commands/suit-monitor.js";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const repertoirePackage = join(repoRoot, "vendor/@0xray/repertoire/package.json");

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "suit-monitor-"));
}

describe("suit monitor", () => {
  it("reads a temp activity log and a temp inference file through the organ", async () => {
    const root = tempRoot();
    const logPath = join(root, "activity.log");
    const inferencePath = join(root, "inference-state.json");
    const xrayPackage = join(root, "package.json");
    writeFileSync(logPath, "one\ntwo\nthree\n");
    writeFileSync(inferencePath, `${JSON.stringify({
      processedSessionIds: ["session-temp"],
      lastRun: "2026-10-02T00:00:00.000Z",
    })}\n`);
    writeFileSync(xrayPackage, `${JSON.stringify({ name: "0xray", version: "9.9.9" })}\n`);

    const picture = await readSuitPicture({
      activityLogPath: logPath,
      inferenceStatePath: inferencePath,
      repertoirePackageJson: repertoirePackage,
      xrayPackageJson: xrayPackage,
      tail: 2,
    });

    expect(picture.activityLines).toEqual(["two", "three"]);
    expect(picture.inferenceStatePresent).toBe(true);
    expect(picture.inferenceLastRun).toBe("2026-10-02T00:00:00.000Z");
    expect(picture.repertoireVersion).toBe("0.2.8");
    expect(picture.xrayVersion).toBe("9.9.9");
    expect(formatSuitPicture(picture)).toBe([
      "suit monitor",
      "xray: 9.9.9",
      "repertoire: 0.2.8",
      "inference state: present lastRun 2026-10-02T00:00:00.000Z",
      "activity:",
      "  two",
      "  three",
    ].join("\n"));
    rmSync(root, { recursive: true, force: true });
  });

  it("keeps a missing inference file absent and does not create one", async () => {
    const root = tempRoot();
    const inferencePath = join(root, "inference-state.json");
    const xrayPackage = join(root, "package.json");
    writeFileSync(xrayPackage, `${JSON.stringify({ version: "4.0.36" })}\n`);

    const picture = await readSuitPicture({
      activityLogPath: join(root, "missing-activity.log"),
      inferenceStatePath: inferencePath,
      repertoirePackageJson: repertoirePackage,
      xrayPackageJson: xrayPackage,
    });

    expect(picture.activityLines).toEqual([]);
    expect(picture.inferenceStatePresent).toBe(false);
    expect(picture.inferenceLastRun).toBeNull();
    expect(existsSync(inferencePath)).toBe(false);
    expect(formatSuitPicture(picture)).toContain("inference state: absent");
    expect(formatSuitPicture(picture)).toContain("  (none)");
    rmSync(root, { recursive: true, force: true });
  });

  it("wires the monitor onto the 0xray command", () => {
    const cli = readFileSync(join(repoRoot, "src/cli/index.ts"), "utf8");
    expect(cli).toContain('.command("monitor")');
    expect(cli).toContain("printSuitMonitor");
  });
});
