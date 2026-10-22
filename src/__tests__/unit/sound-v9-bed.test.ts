import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type DrumSample = {
  role: string;
  license: string;
  sourceUrl: string;
  licenseUrl: string;
  file: string;
};

type DrumManifest = {
  bed: string;
  note: string;
  samples: DrumSample[];
};

type Check = {
  id: string;
  pass: boolean;
  detail: { worstExcessDb?: number; centroidShiftHz?: number };
};

type BedMetrics = {
  name: string;
  pass: boolean;
  fails: string[];
  earReady: boolean;
  lufs: number;
  truePeakDb: number;
  cues: Record<string, number>;
  sources: {
    pad: string;
    kickBeater: string;
    kickBody: string;
    hat: string;
    clap: string;
    sub: string;
    pluck: string;
    stab: string;
  };
  rules: { pass: boolean; fails: string[]; checks: Check[] };
  reference: {
    pass: boolean;
    audioStored: boolean;
    measured: { lowShare30to120: number };
  };
  gaps: {
    sideUnderMidDb: number;
    band4to8After11Db: number;
    kickHfDb: number;
    padMotionDb: number;
  };
};

type Magnetic = {
  CUES: Record<string, number>;
  loadBed: (variant: string) => Promise<unknown>;
  renderBed: (variant: string) => unknown;
  measureBed: (bed: unknown) => BedMetrics;
};

const magnetic = requireCjs(path.join(root, "scripts/foundry/sound-magnetic.cjs")) as Magnetic;

describe("BED-MAGNETIC-MOVES-v9", () => {
  it("records a CC0 source for each drum one-shot and stores no reference audio", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "scripts/foundry/cc0/manifest.json"), "utf8")) as DrumManifest;
    expect(manifest.bed).toBe("BED-MAGNETIC-MOVES-v9");
    expect(manifest.note).toContain("no reference audio");
    expect(manifest.samples.map((row) => row.role)).toEqual([
      "kick",
      "closed hat",
      "open hat",
      "clap",
    ]);
    for (const sample of manifest.samples) {
      expect(sample.license).toBe("CC0 1.0 Universal");
      expect(sample.sourceUrl).toMatch(/^https:\/\//);
      expect(sample.licenseUrl).toMatch(/^https:\/\//);
      const bytes = readFileSync(path.join(root, "scripts/foundry/cc0", sample.file));
      expect(bytes.length).toBeGreaterThan(40);
      expect(sample.file.endsWith(".wav")).toBe(true);
    }
  });

  it("keeps the v7 cue map, swaps only the winning base sounds, and passes both gates", async () => {
    const bed = await magnetic.loadBed("v9");
    const metrics = magnetic.measureBed(bed);
    expect(metrics.name).toBe("BED-MAGNETIC-MOVES-v9");
    expect(metrics.cues).toEqual(magnetic.CUES);
    expect(metrics.sources).toEqual({
      pad: "v8lib-elementary-blepsaw",
      kickBeater: "v8lib-cc0-kick",
      kickBody: "mill",
      hat: "v8lib-cc0",
      clap: "v8lib-cc0",
      sub: "mill",
      mid: "mill",
      pluck: "mill",
      stab: "mill",
    });
    expect(metrics.pass, metrics.fails.join(", ")).toBe(true);
    expect(metrics.rules.pass, metrics.rules.fails.join(", ")).toBe(true);
    expect(metrics.reference.pass).toBe(true);
    expect(metrics.reference.audioStored).toBe(false);
    expect(metrics.earReady).toBe(true);
    expect(metrics.lufs).toBeGreaterThanOrEqual(-16);
    expect(metrics.lufs).toBeLessThanOrEqual(-14);
    expect(metrics.truePeakDb).toBeLessThanOrEqual(-1);
    expect(metrics.reference.measured.lowShare30to120).toBeGreaterThanOrEqual(0.6);
    expect(metrics.reference.measured.lowShare30to120).toBeLessThanOrEqual(0.9);
    expect(metrics.gaps.sideUnderMidDb).toBeLessThanOrEqual(-8);
    expect(metrics.gaps.sideUnderMidDb).toBeGreaterThanOrEqual(-20);
    expect(metrics.gaps.band4to8After11Db).toBeGreaterThan(-47);
    expect(metrics.gaps.band4to8After11Db).toBeLessThan(-27);
    expect(metrics.gaps.kickHfDb).toBeGreaterThan(-50);
    expect(metrics.gaps.padMotionDb).toBeGreaterThan(0);
    expect(metrics.gaps.padMotionDb).toBeLessThanOrEqual(1.5);
    const foreground = metrics.rules.checks.find((row) => row.id === "foreground");
    const pad = metrics.rules.checks.find((row) => row.id === "pad");
    expect(foreground?.detail.worstExcessDb ?? 99).toBeLessThanOrEqual(3);
    expect(pad?.detail.centroidShiftHz ?? 0).toBeGreaterThanOrEqual(4);
  }, 60000);

  it("leaves the hand-built v7 bed ear-ready", () => {
    const metrics = magnetic.measureBed(magnetic.renderBed("v7"));
    expect(metrics.pass, metrics.fails.join(", ")).toBe(true);
    expect(metrics.earReady).toBe(true);
  }, 60000);
});
