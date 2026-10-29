import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const magnetic = require("../../../scripts/foundry/sound-magnetic.cjs");

const manifestPath = join(process.cwd(), "scripts/foundry/cc0/manifest.json");

type DrumSample = {
  role: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
  file: string;
};

type DrumManifest = {
  bed: string;
  samples: DrumSample[];
};

describe("BED-MAGNETIC-MOVES-v8lib", () => {
  it("records a CC0 source for each drum one-shot", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DrumManifest;
    expect(manifest.bed).toBe("BED-MAGNETIC-MOVES-v9");
    expect(manifest.samples.map((row) => row.role)).toEqual([
      "kick",
      "closed hat",
      "open hat",
      "open hat",
      "clap",
    ]);
    for (const sample of manifest.samples) {
      expect(sample.license).toBe("CC0 1.0 Universal");
      expect(sample.sourceUrl).toMatch(/^https:\/\//);
      expect(sample.licenseUrl).toMatch(/^https:\/\//);
      const bytes = readFileSync(join(process.cwd(), "scripts/foundry/cc0", sample.file));
      expect(bytes.length).toBeGreaterThan(40);
    }
  });

  it("matches the v7 cue map and passes both gates", async () => {
    const bed = await magnetic.loadBed("v8lib");
    const metrics = magnetic.measureBed(bed);
    expect(bed.name).toBe("BED-MAGNETIC-MOVES-v8lib");
    expect(metrics.cues).toEqual(magnetic.CUES);
    expect(metrics.library.synthesis).toBe("@elemaudio/core");
    expect(metrics.pass).toBe(true);
    expect(metrics.rules.pass).toBe(true);
    expect(metrics.reference.pass).toBe(true);
    expect(metrics.earReady).toBe(true);
    expect(metrics.lufs).toBeGreaterThanOrEqual(-16);
    expect(metrics.lufs).toBeLessThanOrEqual(-14);
    expect(metrics.truePeakDb).toBeLessThanOrEqual(-1);
  }, 60000);

  it("leaves the hand-built v7 bed ear-ready", () => {
    const metrics = magnetic.measureBed(magnetic.renderBed("v7"));
    expect(metrics.pass).toBe(true);
    expect(metrics.earReady).toBe(true);
  }, 60000);
});
